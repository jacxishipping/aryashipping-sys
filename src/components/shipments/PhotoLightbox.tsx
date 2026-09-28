'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoLightboxProps {
  images: string[];
  index: number;
  title?: string;
  /** Whether to show the delete button */
  canDelete?: boolean;
  /** Called when the user closes the lightbox */
  onClose: () => void;
  /** Called when navigating — returns the new index */
  onNavigate: (index: number) => void;
  /** Called when user taps Delete — passes index */
  onDelete?: (index: number) => Promise<void>;
  /** Called when user taps Download (single photo) */
  onDownload?: (url: string, index: number) => Promise<void>;
  /** Called when user taps Download All */
  onDownloadAll?: (urls: string[]) => Promise<void>;
  downloading?: boolean;
}

const ZOOM_STEP = 0.3;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;

export default function PhotoLightbox({
  images,
  index,
  title,
  canDelete = false,
  onClose,
  onNavigate,
  onDelete,
  onDownload,
  onDownloadAll,
  downloading = false,
}: PhotoLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [deleting, setDeleting] = useState(false);

  // Swipe tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Direction state for slide animation
  const [direction, setDirection] = useState<1 | -1>(1);
  const [imageKey, setImageKey] = useState(index);

  // Reset zoom/pan when index changes
  useEffect(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setImageKey(index);
  }, [index]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const navigate = useCallback((dir: 1 | -1) => {
    if (images.length <= 1) return;
    setDirection(dir);
    const next = (index + dir + images.length) % images.length;
    onNavigate(next);
  }, [index, images.length, onNavigate]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': navigate(-1); break;
        case 'ArrowRight': navigate(1); break;
        case '+': case '=': setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)); break;
        case '-': case '_': setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onClose]);

  // Scroll-to-zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (zoom === 1 && e.deltaY === 0) return;
    e.preventDefault();
    setZoom(z => {
      const next = z - e.deltaY * 0.001;
      return Math.min(Math.max(next, ZOOM_MIN), ZOOM_MAX);
    });
  }, [zoom]);

  const handleDoubleClick = useCallback(() => {
    setZoom(z => {
      const next = z > 1 ? 1 : 2;
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && zoom === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    // Only trigger swipe if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      navigate(dx < 0 ? 1 : -1);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(index);
    } finally {
      setDeleting(false);
    }
  };

  const current = images[index];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
  };

  const zoomPct = Math.round(zoom * 100);

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox-backdrop"
        className="fixed inset-0 z-[9999] flex flex-col"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        {/* ── Inner shell — stops backdrop-click from firing on chrome ── */}
        <div
          className="flex h-full flex-col overflow-hidden rounded-none shadow-2xl sm:m-6 sm:rounded-2xl"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
          onClick={e => e.stopPropagation()}
        >

          {/* ══════════════════════════════════
               TOP BAR
          ══════════════════════════════════ */}
          <div
            className="z-40 flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-5"
            style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--panel)' }}
          >

            {/* Left: title + counter + zoom badge */}
            <div className="flex min-w-0 items-center gap-2">
              {title && (
                <span
                  className="truncate text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {title}
                </span>
              )}
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {index + 1} / {images.length}
              </span>
              {zoom > 1 && (
                <span
                  className="hidden shrink-0 rounded px-2 py-0.5 text-[11px] font-bold sm:inline"
                  style={{ backgroundColor: 'var(--accent-gold)', color: '#fff' }}
                >
                  {zoomPct}%
                </span>
              )}
            </div>

            {/* Right: action buttons */}
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Zoom out */}
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
                disabled={zoom <= ZOOM_MIN}
                className="hidden h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-30 sm:flex"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              {/* Zoom in */}
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
                disabled={zoom >= ZOOM_MAX}
                className="hidden h-8 w-8 items-center justify-center rounded-lg transition-all disabled:opacity-30 sm:flex"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <div className="hidden h-5 w-px sm:block" style={{ backgroundColor: 'var(--border)' }} />

              {/* Download current */}
              {onDownload && (
                <button
                  type="button"
                  onClick={() => void onDownload(current, index)}
                  disabled={downloading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                  aria-label="Download this photo"
                >
                  {downloading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}

              {/* Download all */}
              {onDownloadAll && images.length > 1 && (
                <button
                  type="button"
                  onClick={() => void onDownloadAll(images)}
                  disabled={downloading}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent-gold)', color: '#fff' }}
                  aria-label="Download all photos"
                >
                  {downloading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">All ({images.length})</span>
                </button>
              )}

              {/* Delete */}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ backgroundColor: 'var(--error-light)', border: '1px solid var(--error)', color: 'var(--error)' }}
                  aria-label="Delete photo"
                >
                  {deleting ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}

              <div className="hidden h-5 w-px sm:block" style={{ backgroundColor: 'var(--border)' }} />

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all"
                style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                aria-label="Close viewer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════
               MAIN IMAGE STAGE — intentionally dark for photo viewing
          ══════════════════════════════════ */}
          <div
            className="relative flex-1 overflow-hidden bg-black"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={imageKey}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
                style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
              >
                <motion.div
                  animate={{ scale: zoom, x: panOffset.x, y: panOffset.y }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  drag={zoom > 1}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    setPanOffset(prev => ({ x: prev.x + info.offset.x, y: prev.y + info.offset.y }));
                  }}
                  className="relative h-full w-full"
                  style={{ touchAction: 'none' }}
                >
                  <Image
                    src={current}
                    alt={`${title ? title + ' — ' : ''}Photo ${index + 1}`}
                    fill
                    className="object-contain drop-shadow-2xl"
                    unoptimized
                    priority
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* ── Navigation arrows — centered vertically in image stage ── */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="absolute left-4 top-1/2 z-30 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200 focus-visible:outline-none sm:h-12 sm:w-12"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(1)}
                  className="absolute right-4 top-1/2 z-30 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl shadow-lg backdrop-blur-sm transition-all duration-200 focus-visible:outline-none sm:h-12 sm:w-12"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-gold)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </>
            )}

            {/* ── Zoom hint ── */}
            {zoom === 1 && (
              <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] text-white/40 backdrop-blur-sm"
                style={{ border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.35)' }}
              >
                Double-click or scroll to zoom
              </p>
            )}
          </div>

          {/* ══════════════════════════════════
               THUMBNAIL STRIP
          ══════════════════════════════════ */}
          {images.length > 1 && (
            <div
              className="z-20 shrink-0 py-3"
              style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--panel)' }}
            >
              <div className="overflow-x-auto">
                <div className="flex min-w-max items-center gap-2 px-4 sm:px-5">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDirection(i > index ? 1 : -1);
                        onNavigate(i);
                      }}
                      className={cn(
                        'relative h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150 sm:h-[68px] sm:w-[68px]',
                        i === index ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                      )}
                      style={i === index
                        ? { borderColor: 'var(--accent-gold)', boxShadow: '0 0 0 2px rgba(212,175,55,0.25)' }
                        : { borderColor: 'var(--border)' }
                      }
                      aria-label={`Go to photo ${i + 1}`}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${i + 1}`}
                        fill
                        className="object-cover"
                        loading="lazy"
                        unoptimized
                      />
                      <span
                        className="absolute bottom-0.5 right-0.5 rounded px-1 py-0.5 text-[9px] font-bold leading-none"
                        style={i === index
                          ? { backgroundColor: 'var(--accent-gold)', color: '#fff' }
                          : { backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff' }
                        }
                      >
                        {i + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
