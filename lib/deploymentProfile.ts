/**
 * Build-time deployment profile (set in Vercel per project).
 *
 *   VITE_DEPLOYMENT_PROFILE=judge   → lens-app: home first, samples + cloud upload
 *   VITE_DEPLOYMENT_PROFILE=artisan → photography-coach: Artisan journey first (default)
 */

export type DeploymentProfile = 'judge' | 'artisan';

export function getDeploymentProfile(): DeploymentProfile {
  const raw = import.meta.env.VITE_DEPLOYMENT_PROFILE;
  return raw === 'judge' ? 'judge' : 'artisan';
}

export function isJudgeDemoBuild(): boolean {
  return getDeploymentProfile() === 'judge';
}
