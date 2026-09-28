'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Flashlight, SwitchCamera, X, AlertCircle, CheckCircle, RefreshCw, Upload } from 'lucide-react';
import { Box, Typography, IconButton } from '@mui/material';
import Modal from '@/components/design-system/Modal';
import { Alert, Button } from '@/components/design-system';
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Camera className="w-5 h-5 text-[var(--accent-gold)]" />
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {title}
          </Typography>
        </Box>
      }
      description={description}
      size="sm"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Viewfinder Container */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 380,
            aspectRatio: '4/3',
            borderRadius: 3,
            overflow: 'hidden',
            border: '2px solid var(--border)',
            bgcolor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
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
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '12%',
                right: '12%',
                height: 2,
                bgcolor: 'var(--accent-gold)',
                boxShadow: '0 0 12px 2px var(--accent-gold)',
                animation: 'scanLine 2s ease-in-out infinite alternate',
                pointerEvents: 'none',
                '@keyframes scanLine': {
                  '0%': { transform: 'translateY(-60px)' },
                  '100%': { transform: 'translateY(60px)' },
                },
              }}
            />
          )}

          {/* Success Overlay */}
          {scannedResult && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                bgcolor: 'rgba(0,0,0,0.75)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                zIndex: 10,
              }}
            >
              <CheckCircle className="w-12 h-12 text-emerald-500 animate-in zoom-in-75 duration-200" />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                Captured!
              </Typography>
              <Typography sx={{ color: 'var(--accent-gold)', fontFamily: 'monospace', fontWeight: 700 }}>
                {scannedResult}
              </Typography>
            </Box>
          )}

          {/* Corner Guides */}
          {isScanning && !scannedResult && (
            <Box sx={{ position: 'absolute', inset: 16, pointerEvents: 'none', border: '1px dashed rgba(255,255,255,0.3)', borderRadius: 2 }} />
          )}
        </Box>

        {/* Camera Controls Bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: 380,
            mt: 2,
            px: 1,
          }}
        >
          {cameras.length > 1 ? (
            <IconButton
              onClick={switchCamera}
              size="small"
              sx={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              title="Switch camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </IconButton>
          ) : <Box />}

          {hasTorch && (
            <IconButton
              onClick={toggleTorch}
              size="small"
              sx={{
                color: torchOn ? '#eab308' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                bgcolor: torchOn ? 'rgba(234, 179, 8, 0.15)' : 'transparent',
              }}
              title="Toggle flashlight"
            >
              <Flashlight className="w-4 h-4" />
            </IconButton>
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
        </Box>

        {/* Error Feedback */}
        {error && (
          <Box sx={{ mt: 2, width: '100%' }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
      </Box>
    </Modal>
  );
}
