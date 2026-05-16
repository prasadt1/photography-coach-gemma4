import React, { useCallback, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2, Aperture, ArrowUp, Brain, Zap, Target, Eye, Sparkles } from 'lucide-react';

interface PhotoUploaderProps {
  onImageSelected: (base64: string, mimeType: string, file: File, imageEl: HTMLImageElement) => void;
  isAnalyzing: boolean;
  analysisProgress?: { message: string; pct: number };
}

const THINKING_STEPS = [
  { text: "Running CV analysis (EXIF, histogram, focus map)…", icon: Brain },
  { text: "Analyzing composition and framing…", icon: Target },
  { text: "Evaluating lighting and exposure…", icon: Zap },
  { text: "Assessing technique and sharpness…", icon: Eye },
  { text: "Generating critique and recommendations…", icon: Sparkles },
];

const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onImageSelected, isAnalyzing, analysisProgress }) => {
  const [dragActive, setDragActive] = useState(false);
  const [currentThinkingStep, setCurrentThinkingStep] = useState(0);

  // Simulated thinking process timer
  useEffect(() => {
    if (isAnalyzing) {
      setCurrentThinkingStep(0);
      const interval = setInterval(() => {
        setCurrentThinkingStep(prev => {
          if (prev < THINKING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000); // Advance step every 2 seconds
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Create an HTMLImageElement so cvService can read pixel data
      const img = new Image();
      img.onload = () => onImageSelected(dataUrl, file.type, file, img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto z-10 relative">
      <div
        className={`relative group flex flex-col items-center justify-center w-full min-h-[320px] md:min-h-[400px] rounded-[2rem] md:rounded-[2.5rem] border-2 border-dashed transition-all duration-500 ease-out cursor-pointer overflow-hidden
          ${dragActive
            ? 'border-[#C06B45] bg-[#C06B45]/10 scale-[1.02] shadow-2xl'
            : 'border-[#D8CDB8] bg-[#F4ECDC] hover:bg-[#ECE3D2] hover:border-[#C06B45] hover:shadow-xl'
          }
          ${isAnalyzing ? 'border-[#C06B45]/20 bg-[#F4ECDC] cursor-default' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        role="region"
        aria-label={isAnalyzing ? 'Photo analysis in progress' : 'Photo upload area. Drag and drop an image or click to browse.'}
      >
        <input
          type="file"
          className={`absolute inset-0 w-full h-full opacity-0 z-20 ${isAnalyzing ? 'pointer-events-none' : 'cursor-pointer'}`}
          onChange={handleChange}
          accept="image/*"
          disabled={isAnalyzing}
          aria-label="Upload a photo for analysis. Supports JPG, PNG, and WEBP formats up to 10MB"
        />
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
           <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent animate-pulse-slow"></div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 md:p-8 text-center relative z-10 w-full max-w-lg">
          {isAnalyzing ? (
            <div className="w-full animate-fadeIn flex flex-col items-center" role="status" aria-live="polite" aria-busy="true">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-[#C06B45]/20 blur-xl rounded-full animate-pulse" aria-hidden="true"></div>
                <Loader2 className="w-16 h-16 text-[#C06B45] animate-spin relative z-10" aria-hidden="true" />
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-[#241F18] mb-2">Gemma 4 is thinking...</h3>

              {/* Live progress bar (streaming) */}
              {analysisProgress && (
                <div className="w-full mt-3 mb-2">
                  <div className="flex justify-between text-xs text-[#524A3D] mb-1">
                    <span>{analysisProgress.message}</span>
                    <span>{analysisProgress.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#D8CDB8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C06B45] rounded-full transition-all duration-300"
                      style={{ width: `${analysisProgress.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Thinking steps (fallback when no live progress) */}
              <div className="w-full mt-4 bg-white/50 rounded-xl border-2 border-[#D8CDB8] p-4 font-mono text-sm text-left shadow-inner">
                <div className="space-y-3">
                  {THINKING_STEPS.map((step, index) => {
                    const isActive = index === currentThinkingStep;
                    const isPast = index < currentThinkingStep;
                    const isFuture = index > currentThinkingStep;

                    return (
                      <div 
                        key={index}
                        className={`flex items-center gap-3 transition-all duration-500 ${
                          isFuture ? 'opacity-0 translate-y-2 hidden' : 'opacity-100 translate-y-0'
                        }`}
                      >
                        <div className={`
                          p-1.5 rounded-md transition-colors duration-300
                          ${isActive ? 'bg-[#C06B45]/20 text-[#C06B45]' : 'bg-[#D8CDB8] text-[#524A3D]'}
                          ${isPast ? 'text-[#2F4858]' : ''}
                        `}>
                          <step.icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                        </div>
                        <span className={`
                          ${isActive ? 'text-[#241F18] font-semibold' : 'text-[#524A3D]'}
                          ${isPast ? 'text-[#524A3D]/50 line-through decoration-[#D8CDB8]' : ''}
                        `}>
                          {step.text}
                        </span>
                        {isActive && (
                          <span className="flex h-2 w-2 relative ml-auto">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C06B45] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C06B45]"></span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
            </div>
          ) : (
            <>
              <div className="mb-6 md:mb-8 relative group-hover:scale-110 transition-transform duration-500">
                <div className="absolute inset-0 bg-[#C06B45]/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full border-2 border-[#D8CDB8] flex items-center justify-center shadow-xl group-hover:border-[#C06B45] transition-colors duration-300">
                   <Upload className="w-8 h-8 md:w-10 md:h-10 text-[#524A3D] group-hover:text-[#C06B45] transition-colors duration-300" />
                </div>
                {/* Floating icons */}
                <Aperture className="absolute -top-2 -right-2 w-6 h-6 md:w-8 md:h-8 text-[#A9B8BE] group-hover:text-[#C06B45]/70 transition-colors duration-500 animate-bounce-slow delay-100" />
                <ImageIcon className="absolute -bottom-2 -left-2 w-6 h-6 md:w-8 md:h-8 text-[#A9B8BE] group-hover:text-[#2F4858]/70 transition-colors duration-500 animate-bounce-slow delay-300" />
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-[#241F18] mb-3 tracking-tight">
                Upload a photo to get <br/>
                <span className="text-[#C06B45]">expert feedback in seconds</span>
              </h3>
              <p className="text-base md:text-lg text-[#524A3D] max-w-md mb-8 leading-relaxed">
                Drag and drop your image here, or click to browse.
                <br />
                <span className="text-sm text-[#524A3D]/70 mt-2 block">Supports JPG, PNG, WEBP (Max 10MB)</span>
              </p>

              <div className="px-6 py-3 md:px-8 md:py-3.5 bg-[#C06B45] rounded-full text-white text-sm font-semibold border-2 border-[#C06B45] group-hover:bg-[#A6552F] group-hover:border-[#A6552F] transition-all duration-300 shadow-lg flex items-center gap-2">
                <ArrowUp className="w-4 h-4" />
                Start Analysis
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoUploader;