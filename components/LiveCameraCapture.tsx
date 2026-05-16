/**
 * LiveCameraCapture.tsx - getUserMedia-based voice-first camera
 *
 * Dissolves the iOS gesture problem:
 * - One permission tap on entry (launching the studio)
 * - Live video preview stays open
 * - Voice "take photo" → synchronous canvas capture (works!)
 * - No file picker, no handoff to native camera app
 */

import React, { useRef, useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';

interface LiveCameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onClose?: () => void;
  promptText?: string;
  buttonLabel?: string;
}

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  onCapture,
  onClose,
  promptText = 'Position your craft in good light',
  buttonLabel = 'Take Photo',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending');

  // Start video stream
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        // Request rear camera (environment) with high resolution
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsStreaming(true);
            setPermissionState('granted');
          };
        }
      } catch (err) {
        console.error('[LiveCamera] Failed to start camera:', err);
        if (mounted) {
          setPermissionState('denied');
          setError(
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in your browser settings.'
              : 'Could not access camera. Please check your device settings.'
          );
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      // Stop all tracks when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Capture current video frame to canvas
   * This is SYNCHRONOUS - works from voice callback!
   */
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isStreaming) {
      console.warn('[LiveCamera] Cannot capture: video not ready');
      return;
    }

    // Set canvas to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL (base64)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    onCapture(imageDataUrl);
  };

  // Expose capture function to parent via ref (for voice commands)
  useEffect(() => {
    // Store capture function globally so voice handler can call it
    (window as any).__artisanCameraCapture = captureFrame;
    return () => {
      delete (window as any).__artisanCameraCapture;
    };
  }, [isStreaming]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <p className="text-sm font-medium">{promptText}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Live video preview */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
          style={{ transform: 'scaleX(-1)' }} // Mirror for better UX
        />

        {!isStreaming && permissionState === 'pending' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <p className="text-white text-lg">Starting camera...</p>
          </div>
        )}
      </div>

      {/* Capture button */}
      <div className="p-6 bg-black/50 flex justify-center">
        <button
          onClick={captureFrame}
          disabled={!isStreaming}
          className="inline-flex items-center gap-3 px-8 py-4 bg-[#C06B45] hover:bg-[#A6552F] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full text-lg font-bold shadow-xl transition-colors"
          aria-label={buttonLabel}
        >
          <Camera className="w-6 h-6" />
          <span>{buttonLabel}</span>
        </button>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default LiveCameraCapture;
