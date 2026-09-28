'use client';

import Image from 'next/image';
import { Upload, Plus, Download, ZoomIn, Package } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface PhotoGalleryItem {
  url: string;
  label?: string;
}

interface UploadProgress {
  name: string;
  progress: number;
}

interface PhotoGalleryProps {
  photos: PhotoGalleryItem[];
  onPhotoClick: (index: number) => void;
  canUpload?: boolean;
  onUpload?: (files: File[]) => Promise<void>;
  onDelete?: (index: number) => Promise<void>;
  uploadProgress?: UploadProgress[];
  uploading?: boolean;
  uploadLabel?: string;
  onDownloadSingle?: (url: string, index: number) => Promise<void>;
  onDownloadAll?: (urls: string[]) => Promise<void>;
  className?: string;
}

export default function PhotoGallery({
  photos,
  onPhotoClick,
  canUpload = false,
  onUpload,
  onDelete,
  uploadProgress = [],
  uploading = false,
  uploadLabel,
  onDownloadSingle,
  onDownloadAll,
  className,
}: PhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !onUpload) return;
    await onUpload(Array.from(files));
  }, [onUpload]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (!onDelete || deletingIndex !== null) return;
    setDeletingIndex(index);
    try {
      await onDelete(index);
    } finally {
      setDeletingIndex(null);
    }
  };

  const handleDownloadSingleClick = async (e: React.MouseEvent, url: string, index: number) => {
    e.stopPropagation();
    if (!onDownloadSingle || downloadingIndex !== null) return;
    setDownloadingIndex(index);
    try {
      await onDownloadSingle(url, index);
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadAllClick = async () => {
    if (!onDownloadAll || downloadingAll) return;
    setDownloadingAll(true);
    try {
      await onDownloadAll(photos.map(p => p.url));
    } finally {
      setDownloadingAll(false);
    }
  };

  const hasPhotos = photos.length > 0;

  if (!hasPhotos && !canUpload) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Package className="mb-3 h-10 w-10 text-[var(--text-secondary)]/40" />
        <p className="text-sm text-[var(--text-secondary)]">No photos available yet.</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>

      {/* Upload area */}
      {canUpload && onUpload && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'relative flex h-24 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200',
            dragging
              ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 scale-[1.01]'
              : 'border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)]/70 hover:bg-[var(--accent-gold)]/5',
            uploading && 'pointer-events-none opacity-60'
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => void handleFiles(e.target.files).then(() => { e.target.value = ''; })}
            className="hidden"
            disabled={uploading}
          />
          <div className="flex flex-col items-center gap-1">
            {uploading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-gold)] border-t-transparent" />
            ) : (
              <div className="flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-[var(--accent-gold)]" />
                <Upload className="h-4 w-4 text-[var(--accent-gold)]" />
              </div>
            )}
            <p className="text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--accent-gold)]">{uploadLabel || 'Add Photos'}</span>
              {' — drag & drop or click'}
            </p>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-1.5">
          {uploadProgress.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-[var(--text-primary)]">{item.name}</p>
                {item.progress >= 0 ? (
                  <div className="mt-1 h-1 w-full rounded-full bg-[var(--border)]">
                    <div className="h-1 rounded-full bg-[var(--accent-gold)] transition-all duration-300" style={{ width: `${item.progress}%` }} />
                  </div>
                ) : (
                  <p className="text-xs text-[var(--error)]">Upload failed</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                {item.progress >= 0 ? (item.progress === 100 ? '✓' : `${item.progress}%`) : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Photo grid */}
      {hasPhotos && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {photos.map((photo, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--border)]">
                {/* Invisible click layer to open lightbox */}
                <button
                  type="button"
                  onClick={() => onPhotoClick(i)}
                  className="absolute inset-0 z-10"
                  aria-label={`View photo ${i + 1}${photo.label ? ` — ${photo.label}` : ''}`}
                />
                <Image
                  src={photo.url}
                  alt={`Photo ${i + 1}${photo.label ? ` — ${photo.label}` : ''}`}
                  fill
                  className="object-cover"
                  loading="lazy"
                  unoptimized
                />
                {/* Hover overlay */}
                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-all duration-150 group-hover:bg-black/25" />
                {/* Zoom icon on hover */}
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <ZoomIn className="h-6 w-6 text-white drop-shadow" />
                </div>
                {/* Photo number badge */}
                <span className="pointer-events-none absolute bottom-1 left-1 z-20 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-black/60 text-white">
                  {i + 1}
                </span>
                {/* Action buttons (above click layer) */}
                <div className="absolute right-1 top-1 z-30 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  {canUpload && onDelete && (
                    <button
                      type="button"
                      onClick={(e) => void handleDelete(e, i)}
                      disabled={deletingIndex !== null}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/90 text-white shadow transition-colors hover:bg-red-600 disabled:opacity-50"
                      aria-label={`Delete photo ${i + 1}`}
                    >
                      {deletingIndex === i ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                      ) : (
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  )}
                  {onDownloadSingle && (
                    <button
                      type="button"
                      onClick={(e) => void handleDownloadSingleClick(e, photo.url, i)}
                      disabled={downloadingIndex !== null}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-gold)]/90 text-white shadow transition-colors hover:bg-[var(--accent-gold)] disabled:opacity-50"
                      aria-label={`Download photo ${i + 1}`}
                    >
                      {downloadingIndex === i ? (
                        <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Download all */}
          {onDownloadAll && photos.length > 1 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleDownloadAllClick()}
                disabled={downloadingAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-gold)] px-3 py-1.5 text-xs font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
              >
                {downloadingAll ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download All ({photos.length})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
