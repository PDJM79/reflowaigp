import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  title?: string;
}

export function CameraCapture({ isOpen, onClose, onCapture, title = "Take Photo" }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Unable to access camera. Please check permissions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const handleClose = useCallback(() => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  }, [stopCamera, onClose]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and capture
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
    }
    startCamera();
  }, [capturedImage, startCamera]);

  const confirmPhoto = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        handleClose();
      }
    }, 'image/jpeg', 0.9);
  }, [capturedImage, onCapture, handleClose]);

  // Start camera when dialog opens
  React.useEffect(() => {
    if (isOpen && !stream && !capturedImage) {
      startCamera();
    }
  }, [isOpen, stream, capturedImage, startCamera]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera();
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [stopCamera, capturedImage]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {capturedImage ? 'Review your photo and confirm or retake' : 'Position your camera and tap to capture'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-white">Starting camera...</div>
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-full object-cover"
              />
            )}
            
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex justify-center gap-4">
            {!capturedImage ? (
              <>
                <Button variant="outline" onClick={handleClose}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={capturePhoto} 
                  disabled={!stream || isLoading}
                  size="lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={retakePhoto}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={confirmPhoto}>
                  <Check className="h-4 w-4 mr-2" />
                  Use Photo
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}