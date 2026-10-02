'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Flashlight, SwitchCamera, CheckCircle, Upload } from 'lucide-react';
import Modal from '@/components/design-system/Modal';
import { Alert, Button, IconButton } from '@/components/design-system';
import { sanitizeTrackNumber } from '@/lib/tracking-sanitize';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title?: string;
  description?: string;
}

// Play pleasant confirmation beep using Web Audio API
function playScanSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {}
}

export function BarcodeScannerModal({
  open,
  onClose,
  onScan,
  title = 'Scan Barcode or QR Code',
  description = 'Align the VIN barcode, container code, or gate pass within the frame',
}: BarcodeScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-viewport';

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
      }
    }
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      // Trigger haptic vibration & sound
      if (typeof window !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(100); } catch {}
      }
      playScanSound();

      // Clean decoded text using centralized tracking sanitizer
      const cleaned = sanitizeTrackNumber(decodedText) || decodedText.trim();

      setScannedResult(cleaned);
      await stopScanner();

      // Brief delay to show visual checkmark before closing
      setTimeout(() => {
        onScan(cleaned);
        onClose();
      }, 500);
    },
    [onScan, onClose, stopScanner]
  );

  const startScanner = useCallback(
    async (cameraId: string) => {
      setError(null);
      setScannedResult(null);

      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(containerId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
            ],
            verbose: false,
          });
        }

        await stopScanner();

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333334,
        };

        await scannerRef.current.start(
          cameraId,
          config,
          handleScanSuccess,
          () => {} // ignore frame error
        );

        setIsScanning(true);

        // Check torch capability
        try {
          const track = (scannerRef.current as any).getRunningTrackCameraCapabilities?.();
          setHasTorch(Boolean(track?.torch));
        } catch {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.error('Camera scan start failed:', err);
        setError(err.message || 'Unable to access camera. Please check camera permissions in your browser.');
        setIsScanning(false);
      }
    },
    [handleScanSuccess, stopScanner]
  );

  // Initialize camera list when modal opens
  useEffect(() => {
    let isMounted = true;

    if (open) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (!isMounted) return;
          if (devices && devices.length > 0) {
            const formatted = devices.map((d) => ({ id: d.id, label: d.label || `Camera ${d.id}` }));
            setCameras(formatted);

            // Prefer back/environment camera on phones
            const backCam = formatted.find(
              (c) => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment')
            );
            const chosenId = backCam ? backCam.id : formatted[formatted.length - 1].id;
            setSelectedCameraId(chosenId);
            startScanner(chosenId);
          } else {
            setError('No cameras found on this device.');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error('Error getting cameras:', err);
          setError('Camera permission denied or camera not accessible.');
        });
    } else {
      stopScanner();
      setIsScanning(false);
      setTorchOn(false);
    }

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.error('Torch toggle failed:', err);
    }
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startScanner(nextCamera.id);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-[var(--accent-gold)]" />
          <span className="font-bold text-base text-[var(--text-primary)]">
            {title}
          </span>
        </div>
      }
      description={description}
      size="sm"
    >
      <div className="flex flex-col items-center">
        {/* Viewfinder Container */}
        <div className="relative w-full max-w-[380px] aspect-[4/3] rounded-2xl overflow-hidden border-2 border-[var(--border)] bg-black flex items-center justify-center">
          {/* html5-qrcode element */}
          <div
            id={containerId}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />

          {/* Laser Scan line overlay */}
          {isScanning && !scannedResult && (
            <div
              className="absolute left-[12%] right-[12%] h-[2px] bg-[var(--accent-gold)] shadow-[0_0_12px_2px_var(--accent-gold)] pointer-events-none animate-pulse"
              style={{
                top: '50%',
              }}
            />
          )}

          {/* Success Overlay */}
          {scannedResult && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 z-10 animate-fade-in-up">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <p className="text-white font-bold text-base">
                Captured!
              </p>
              <p className="text-[var(--accent-gold)] font-mono font-bold">
                {scannedResult}
              </p>
            </div>
          )}

          {/* Corner Guides */}
          {isScanning && !scannedResult && (
            <div className="absolute inset-4 pointer-events-none border border-dashed border-white/30 rounded-xl" />
          )}
        </div>

        {/* Camera Controls Bar */}
        <div className="flex items-center justify-between w-full max-w-[380px] mt-4 px-1 gap-2">
          {cameras.length > 1 ? (
            <IconButton
              onClick={switchCamera}
              size="sm"
              variant="outline"
              ariaLabel="Switch camera"
              icon={<SwitchCamera className="w-4 h-4" />}
            />
          ) : <div />}

          {hasTorch && (
            <IconButton
              onClick={toggleTorch}
              size="sm"
              variant={torchOn ? 'primary' : 'outline'}
              ariaLabel="Toggle flashlight"
              icon={<Flashlight className="w-4 h-4" />}
            />
          )}

          {/* Hidden file input for scanning saved QR/barcode images */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setError(null);
                const tempScanner = new Html5Qrcode('barcode-scanner-temp-host', { verbose: false });
                const decoded = await tempScanner.scanFile(file, true);
                await tempScanner.clear();
                await handleScanSuccess(decoded);
              } catch (err) {
                console.error('File scan error:', err);
                setError('Could not detect a QR code or barcode from that image. Please try a clearer image.');
              } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }}
          />
          <div id="barcode-scanner-temp-host" style={{ display: 'none' }} />

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="w-3.5 h-3.5" />}
            className="text-xs"
          >
            Upload image
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-xs"
          >
            Cancel
          </Button>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="mt-4 w-full">
            <Alert severity="error">{error}</Alert>
          </div>
        )}
      </div>
    </Modal>
  );
}
