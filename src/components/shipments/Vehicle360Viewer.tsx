'use client';

import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Pause,
  Play,
  RotateCw,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from 'react';
import { cn } from '@/lib/utils';

const AUTOPLAY_DELAY_MS = 120;
const DRAG_STEP_PX = 18;

type Vehicle360ViewerProps = {
  photos: string[];
  vehicleLabel: string;
  onOpenFrame?: (index: number) => void;
  className?: string;
};

function wrapIndex(index: number, total: number) {
  if (total <= 0) return 0;
  return ((index % total) + total) % total;
}

export default function Vehicle360Viewer({
  photos,
  vehicleLabel,
  onOpenFrame,
  className,
}: Vehicle360ViewerProps) {
  const frameCount = photos.length;
  const canSpin = frameCount > 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartIndexRef = useRef(0);

  useEffect(() => {
    if (frameCount === 0) {
      setActiveIndex(0);
      setIsPlaying(false);
      return;
    }

    setActiveIndex((currentIndex) => Math.min(currentIndex, frameCount - 1));

    if (!canSpin) {
      setIsPlaying(false);
    }
  }, [canSpin, frameCount]);

  useEffect(() => {
    if (!isPlaying || !canSpin) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => wrapIndex(currentIndex + 1, frameCount));
    }, AUTOPLAY_DELAY_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canSpin, frameCount, isPlaying]);

  if (frameCount === 0) {
    return null;
  }

  const currentPhoto = photos[activeIndex] ?? photos[0];
  const interactionLabel = canSpin
    ? (isScrubbing ? 'Scrubbing sequence' : isPlaying ? 'Auto spin enabled' : 'Swipe to rotate')
    : 'Single frame available';

  const stepFrame = (direction: number) => {
    if (!canSpin) return;
    setIsPlaying(false);
    setActiveIndex((currentIndex) => wrapIndex(currentIndex + direction, frameCount));
  };

  const handleSliderChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setActiveIndex(Number(event.target.value));
  };

  const updateFrameFromPointer = (clientX: number) => {
    if (!canSpin || dragStartXRef.current === null) return;

    const dragOffset = clientX - dragStartXRef.current;
    const frameOffset = Math.trunc(dragOffset / DRAG_STEP_PX);

    setActiveIndex(wrapIndex(dragStartIndexRef.current + frameOffset, frameCount));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!canSpin) return;

    setIsPlaying(false);
    setIsScrubbing(true);
    dragStartXRef.current = event.clientX;
    dragStartIndexRef.current = activeIndex;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    updateFrameFromPointer(event.clientX);
  };

  const finishScrub = (event: PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;

    updateFrameFromPointer(event.clientX);
    dragStartXRef.current = null;
    setIsScrubbing(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const renderFrameStrip = (buttonClassName: string, imageSizes: string) => (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {photos.map((photo, index) => {
        const isActive = index === activeIndex;

        return (
          <button
            key={`${photo}-${index}`}
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveIndex(index);
            }}
            className={cn(
              'relative shrink-0 overflow-hidden border transition',
              buttonClassName,
              isActive
                ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/25'
                : 'border-[var(--border)] hover:border-[var(--accent-gold)]/50',
            )}
            aria-label={`Go to frame ${index + 1}`}
          >
            <Image
              src={photo}
              alt={`${vehicleLabel} frame ${index + 1}`}
              fill
              className="object-cover"
              sizes={imageSizes}
              unoptimized
            />
            <span className="absolute bottom-1 left-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={cn(
        'rounded-[28px] border border-[var(--border)] p-3 sm:p-4 md:p-5',
        className,
      )}
      style={{
        background:
          'linear-gradient(140deg, rgba(212,175,55,0.12) 0%, rgba(var(--text-primary-rgb),0.03) 35%, rgba(15,23,42,0.08) 100%)',
      }}
    >
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.85fr)]">
        <div className="space-y-4">
          <div
            className={cn(
              'group relative aspect-[4/3] overflow-hidden rounded-[24px] border border-white/10 sm:aspect-[16/10]',
              canSpin ? 'cursor-ew-resize' : 'cursor-default',
            )}
            style={{
              background:
                'radial-gradient(circle at top, rgba(255,255,255,0.18), transparent 50%), linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.22))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
              touchAction: canSpin ? 'pan-y pinch-zoom' : 'auto',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishScrub}
            onPointerCancel={finishScrub}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(212,175,55,0.18), transparent 42%, rgba(15,23,42,0.14))',
              }}
            />
            <Image
              src={currentPhoto}
              alt={`${vehicleLabel} 360 frame ${activeIndex + 1}`}
              fill
              className="select-none object-contain p-3 sm:p-4 md:p-6"
              draggable={false}
              priority
              unoptimized
            />

            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 sm:left-4 sm:top-4 sm:gap-2">
              <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur-sm sm:px-3 sm:text-[10px] sm:tracking-[0.28em]">
                360 View
              </span>
              <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm sm:px-3 sm:text-[11px]">
                Frame {activeIndex + 1} / {frameCount}
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-start justify-between gap-2.5 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-3 text-white sm:items-end sm:gap-3 sm:p-4">
              <div className="min-w-0 flex-1">
                <p className="max-w-[14rem] truncate text-xs font-semibold sm:max-w-none sm:text-sm">{vehicleLabel}</p>
                <p className="text-[11px] text-white/75 sm:text-xs">
                  {canSpin ? 'Drag sideways, tap frames, or autoplay the sequence.' : 'A single photo is available for this vehicle.'}
                </p>
              </div>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onOpenFrame?.(activeIndex)}
                className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white transition hover:bg-white/15 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
                aria-label="Open current frame"
              >
                <Maximize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="sr-only sm:not-sr-only">Open Frame</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-[20px] border border-[var(--border)] bg-[var(--panel)]/70 p-3 md:p-4">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => stepFrame(-1)}
                disabled={!canSpin}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
                aria-label="Previous frame"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((current) => !current)}
                disabled={!canSpin}
                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[var(--accent-gold)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span className="truncate">{isPlaying ? 'Pause' : 'Auto Spin'}</span>
              </button>
              <button
                type="button"
                onClick={() => stepFrame(1)}
                disabled={!canSpin}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
                aria-label="Next frame"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="col-span-3 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-center text-xs font-medium text-[var(--text-secondary)] sm:ml-auto sm:col-span-1 sm:text-left">
                {interactionLabel}
              </span>
            </div>

            {canSpin && (
              <input
                type="range"
                min={0}
                max={frameCount - 1}
                step={1}
                value={activeIndex}
                onChange={handleSliderChange}
                className="h-3 w-full cursor-pointer accent-[var(--accent-gold)] sm:h-2"
                aria-label="Vehicle 360 frame slider"
              />
            )}
          </div>

          <div className="space-y-3 rounded-[20px] border border-[var(--border)] bg-[var(--panel)]/80 p-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Frames
                </p>
                <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{frameCount}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Playback
                </p>
                <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{isPlaying ? 'Auto' : 'Manual'}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                  Frame Strip
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Tap a frame to jump instantly.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex(0);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            {renderFrameStrip('h-16 w-14 rounded-xl', '56px')}
          </div>
        </div>

        <div className="hidden flex-col gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--panel)]/80 p-4 lg:flex">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)]">
              Sequence Viewer
            </p>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Inspect the vehicle from every uploaded angle
            </h3>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              This 360 preview uses the vehicle images in their current upload order. Even spacing around the car produces the smoothest spin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Frames
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{frameCount}</p>
              <p className="text-xs text-[var(--text-secondary)]">Uploaded sequence</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Playback
              </p>
              <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
                {isPlaying ? 'Auto' : 'Manual'}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {canSpin ? 'Switch anytime' : 'Needs 2+ frames'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                Frame Strip
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveIndex(0);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)]"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            {renderFrameStrip('h-20 w-16 rounded-2xl', '64px')}
          </div>
        </div>
      </div>
    </div>
  );
}