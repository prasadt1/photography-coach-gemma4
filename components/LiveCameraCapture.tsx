/**
 * LiveCameraCapture.tsx - getUserMedia-based voice-first camera
 *
 * Accessible modal: dialog semantics, focus trap, live regions for status/errors.
 */

import React, { useRef, useEffect, useState, useCallback, useId } from 'react';
import { Camera, X } from 'lucide-react';

interface LiveCameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onClose?: () => void;
  promptText?: string;
  buttonLabel?: string;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const LiveCameraCapture: React.FC<LiveCameraCaptureProps> = ({
  onCapture,
  onClose,
  promptText = 'Position your craft in good light',
  buttonLabel = 'Take Photo',
}) => {
  const titleId = useId();
  const statusId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const captureButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [statusMessage, setStatusMessage] = useState('Starting camera. Please allow access if prompted.');

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isStreaming) {
      console.warn('[LiveCamera] Cannot capture: video not ready');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCapture(imageDataUrl);
  }, [isStreaming, onCapture]);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsStreaming(true);
            setPermissionState('granted');
            setStatusMessage('Camera ready. Position your craft, then take photo.');
          };
        }
      } catch (err) {
        console.error('[LiveCamera] Failed to start camera:', err);
        if (mounted) {
          setPermissionState('denied');
          const message =
            err instanceof Error && err.name === 'NotAllowedError'
              ? 'Camera permission denied. Please allow camera access in your browser settings.'
              : 'Could not access camera. Please check your device settings.';
          setError(message);
          setStatusMessage(message);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    (window as Window & { __artisanCameraCapture?: () => void }).__artisanCameraCapture = captureFrame;
    return () => {
      delete (window as Window & { __artisanCameraCapture?: () => void }).__artisanCameraCapture;
    };
  }, [captureFrame]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      if (error) {
        closeButtonRef.current?.focus();
      } else {
        captureButtonRef.current?.focus();
      }
    }, 150);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const nodes = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => !el.hasAttribute('disabled'));

      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previouslyFocusedRef.current?.focus?.();
    };
  }, [error, onClose]);

  const dialogProps = {
    ref: dialogRef,
    role: 'dialog' as const,
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': statusId,
    className: 'fixed inset-0 z-50 bg-black flex flex-col',
  };

  const liveStatus = (
    <p id={statusId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {statusMessage}
    </p>
  );

  if (error) {
    return (
      <div {...dialogProps}>
        <p id={titleId} className="sr-only">
          Camera error
        </p>
        {liveStatus}
        <div className="flex-1 flex items-center justify-center p-4 bg-black/90">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center" role="alert" aria-live="assertive">
            <p className="text-red-700 mb-4">{error}</p>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full font-semibold focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C06B45]/50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div {...dialogProps}>
      <p id={titleId} className="sr-only">
        Live camera for product photo. {promptText}
      </p>
      {liveStatus}

      <div className="flex items-center justify-between p-4 bg-black/50 text-white">
        <p className="text-sm font-medium" aria-hidden="true">
          {promptText}
        </p>
        {onClose && (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
          style={{ transform: 'scaleX(-1)' }}
          aria-label="Live camera preview"
        />

        {!isStreaming && permissionState === 'pending' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70" aria-hidden="true">
            <p className="text-white text-lg">Starting camera…</p>
          </div>
        )}
      </div>

      <div className="p-6 bg-black/50 flex justify-center">
        <button
          ref={captureButtonRef}
          type="button"
          onClick={captureFrame}
          disabled={!isStreaming}
          className="inline-flex items-center gap-3 px-8 py-4 bg-[#C06B45] hover:bg-[#A6552F] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full text-lg font-bold shadow-xl transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
          aria-label={buttonLabel}
        >
          <Camera className="w-6 h-6" aria-hidden="true" />
          <span>{buttonLabel}</span>
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
};

export default LiveCameraCapture;
