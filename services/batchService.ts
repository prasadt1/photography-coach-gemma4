/**
 * batchService.ts — Desktop batch processing with JSONL persistence
 *
 * Queue format:
 * - jobs.jsonl: one line per photo (input)
 * - results.jsonl: one line per completed analysis (output)
 * - checkpoint.json: resume state
 */

import { PhotoAnalysisV2, BatchJob, BatchQueueState } from '../types.v2';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BatchCheckpoint {
  lastCompletedJobId: string;
  timestamp: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export interface BatchConfig {
  batchDir: string;          // where to write JSONL files
  maxConcurrency?: number;   // parallel jobs (default 1 = sequential)
  onProgress?: (completed: number, total: number) => void;
  onJobComplete?: (job: BatchJob) => void;
}

// ─── Queue Manager ──────────────────────────────────────────────────────────

export class BatchQueueManager {
  private config: BatchConfig;
  private jobsPath: string;
  private resultsPath: string;
  private checkpointPath: string;
  private metricsPath: string;

  constructor(config: BatchConfig) {
    this.config = config;
    this.jobsPath = path.join(config.batchDir, 'jobs.jsonl');
    this.resultsPath = path.join(config.batchDir, 'results.jsonl');
    this.checkpointPath = path.join(config.batchDir, 'checkpoint.json');
    this.metricsPath = path.join(config.batchDir, 'metrics.csv');
  }

  // ─── Initialize Queue ─────────────────────────────────────────────────────

  async initializeQueue(photoPaths: string[]): Promise<void> {
    // Ensure batch dir exists
    if (!fs.existsSync(this.config.batchDir)) {
      fs.mkdirSync(this.config.batchDir, { recursive: true });
    }

    // Create jobs.jsonl
    const jobsStream = fs.createWriteStream(this.jobsPath, { flags: 'w' });

    for (const filePath of photoPaths) {
      const job: BatchJob = {
        id: this.generateJobId(filePath),
        filePath,
        fileName: path.basename(filePath),
        status: 'pending',
        addedAt: Date.now(),
        retryCount: 0,
      };
      jobsStream.write(JSON.stringify(job) + '\n');
    }

    jobsStream.end();

    // Initialize checkpoint
    const checkpoint: BatchCheckpoint = {
      lastCompletedJobId: '',
      timestamp: Date.now(),
      totalJobs: photoPaths.length,
      completedJobs: 0,
      failedJobs: 0,
    };
    fs.writeFileSync(this.checkpointPath, JSON.stringify(checkpoint, null, 2));

    // Initialize metrics CSV
    fs.writeFileSync(
      this.metricsPath,
      'job_id,file_name,status,latency_ms,timestamp\n'
    );
  }

  // ─── Resume from Checkpoint ───────────────────────────────────────────────

  async getUnprocessedJobs(): Promise<BatchJob[]> {
    if (!fs.existsSync(this.jobsPath)) {
      throw new Error('jobs.jsonl not found. Call initializeQueue() first.');
    }

    const allJobs = this.readJobsFile();
    const completedIds = this.getCompletedJobIds();

    // Filter to pending jobs not in completed set
    return allJobs.filter(
      (job) => !completedIds.has(job.id) && job.status !== 'skipped'
    );
  }

  // ─── Process Job ──────────────────────────────────────────────────────────

  async recordJobStart(jobId: string): Promise<void> {
    const jobs = this.readJobsFile();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    job.status = 'processing';
    job.startedAt = Date.now();
    this.updateJobsFile(jobs);
  }

  async recordJobComplete(
    jobId: string,
    result: PhotoAnalysisV2,
    latencyMs: number
  ): Promise<void> {
    const jobs = this.readJobsFile();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    job.status = 'done';
    job.completedAt = Date.now();
    job.result = result;

    this.updateJobsFile(jobs);

    // Append to results.jsonl
    const resultEntry = {
      job_id: jobId,
      file_name: job.fileName,
      timestamp: Date.now(),
      analysis: result,
    };
    fs.appendFileSync(this.resultsPath, JSON.stringify(resultEntry) + '\n');

    // Update checkpoint
    const checkpoint = this.readCheckpoint();
    checkpoint.lastCompletedJobId = jobId;
    checkpoint.completedJobs += 1;
    checkpoint.timestamp = Date.now();
    fs.writeFileSync(this.checkpointPath, JSON.stringify(checkpoint, null, 2));

    // Append metrics
    fs.appendFileSync(
      this.metricsPath,
      `${jobId},${job.fileName},done,${latencyMs},${Date.now()}\n`
    );

    this.config.onProgress?.(checkpoint.completedJobs, checkpoint.totalJobs);
    this.config.onJobComplete?.(job);
  }

  async recordJobError(jobId: string, error: string): Promise<void> {
    const jobs = this.readJobsFile();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    job.status = 'error';
    job.completedAt = Date.now();
    job.errorMessage = error;
    job.retryCount += 1;

    this.updateJobsFile(jobs);

    // Update checkpoint
    const checkpoint = this.readCheckpoint();
    checkpoint.failedJobs += 1;
    checkpoint.timestamp = Date.now();
    fs.writeFileSync(this.checkpointPath, JSON.stringify(checkpoint, null, 2));

    // Append metrics
    fs.appendFileSync(
      this.metricsPath,
      `${jobId},${job.fileName},error,0,${Date.now()}\n`
    );

    this.config.onProgress?.(
      checkpoint.completedJobs,
      checkpoint.totalJobs
    );
  }

  // ─── Export Results ───────────────────────────────────────────────────────

  async exportAllXMP(outputDir: string): Promise<number> {
    if (!fs.existsSync(this.resultsPath)) return 0;

    const { exportXMPSidecar } = await import('./xmpService');
    const lines = fs.readFileSync(this.resultsPath, 'utf-8').split('\n');
    let exported = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      const entry = JSON.parse(line);
      const { filename, content } = exportXMPSidecar(
        entry.analysis,
        entry.file_name
      );
      const outPath = path.join(outputDir, filename);
      fs.writeFileSync(outPath, content);
      exported++;
    }

    return exported;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private generateJobId(filePath: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(filePath + Date.now());
    return hash.digest('hex').slice(0, 16);
  }

  private readJobsFile(): BatchJob[] {
    if (!fs.existsSync(this.jobsPath)) return [];
    const lines = fs.readFileSync(this.jobsPath, 'utf-8').split('\n');
    return lines.filter((l) => l.trim()).map((l) => JSON.parse(l));
  }

  private updateJobsFile(jobs: BatchJob[]): void {
    const stream = fs.createWriteStream(this.jobsPath, { flags: 'w' });
    for (const job of jobs) {
      stream.write(JSON.stringify(job) + '\n');
    }
    stream.end();
  }

  private readCheckpoint(): BatchCheckpoint {
    if (!fs.existsSync(this.checkpointPath)) {
      return {
        lastCompletedJobId: '',
        timestamp: Date.now(),
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
      };
    }
    return JSON.parse(fs.readFileSync(this.checkpointPath, 'utf-8'));
  }

  private getCompletedJobIds(): Set<string> {
    if (!fs.existsSync(this.resultsPath)) return new Set();
    const lines = fs.readFileSync(this.resultsPath, 'utf-8').split('\n');
    const ids = new Set<string>();
    for (const line of lines) {
      if (!line.trim()) continue;
      const entry = JSON.parse(line);
      ids.add(entry.job_id);
    }
    return ids;
  }

  getCheckpoint(): BatchCheckpoint {
    return this.readCheckpoint();
  }

  getBatchState(): BatchQueueState {
    const checkpoint = this.readCheckpoint();
    const jobs = this.readJobsFile();
    return {
      jobs,
      lastCheckpoint: checkpoint.timestamp,
      totalProcessed: checkpoint.completedJobs,
      totalErrors: checkpoint.failedJobs,
    };
  }
}
