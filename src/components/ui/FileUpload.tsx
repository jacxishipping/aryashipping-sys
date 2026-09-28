'use client';

import { useRef, useState } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { runWithConcurrency } from '@/lib/concurrency';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  maxFiles?: number;
  onUpload?: (files: File[]) => Promise<void>; // Callback after all uploads complete
  uploadHandler?: (file: File) => Promise<void>; // Function to perform actual upload per file
  onUploadProgress?: (fileId: string, progress: number) => void;
  onProcessingChange?: (processing: boolean) => void;
  className?: string;
}

export function FileUpload({
  accept = 'image/*',
  multiple = true,
  maxSize = 10, // 10MB default
  maxFiles = 10,
  onUpload,
  uploadHandler,
  onUploadProgress,
  onProcessingChange,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB`;
    }
    return null;
  };

  const handleFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileArray = Array.from(selectedFiles);

    // Check max files
    if (files.length + fileArray.length > maxFiles) {
      toast.error('Too many files', `Maximum ${maxFiles} files allowed`);
      return;
    }

    const newFiles: UploadFile[] = fileArray.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending' as const,
    }));

    // Validate files
    const validatedFiles = newFiles.map((uploadFile) => {
      const error = validateFile(uploadFile.file);
      if (error) {
        return { ...uploadFile, status: 'error' as const, error };
      }
      return uploadFile;
    });

    setFiles((prev) => [...prev, ...validatedFiles]);

    // Start upload for valid pending files
    const validFiles = validatedFiles.filter((f) => f.status === 'pending');
    if (validFiles.length > 0) {
      onProcessingChange?.(true);
      await uploadFiles(validFiles);
      onProcessingChange?.(false);
    }
  };

  const uploadFiles = async (uploadFiles: UploadFile[]) => {
    const processFile = async (uploadFile: UploadFile) => {
      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
          )
        );

        if (uploadHandler) {
          // Use provided upload handler
          await uploadHandler(uploadFile.file);
        } else {
          // Simulate progress if no handler provided
          await simulateUpload(uploadFile.id);
        }

        // Mark as success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
          )
        );
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: error.message || 'Upload failed' }
              : f
          )
        );
        toast.error('Upload failed', uploadFile.file.name);
      }
    };

    // Process files with concurrency limit of 3
    await runWithConcurrency(uploadFiles, processFile, 3);

    // Call legacy onUpload if provided (passing all files originally requested)
    if (onUpload) {
      await onUpload(uploadFiles.map((f) => f.file));
    }
  };

  // Simulate upload progress (replace with actual upload)
  const simulateUpload = (fileId: string): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress } : f))
        );
        onUploadProgress?.(fileId, progress);

        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 200);
    });
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/5'
            : 'border-[var(--border)] hover:border-[var(--accent-gold)] hover:bg-[var(--background)]'
        )}
      >
        <Upload className="w-12 h-12 mx-auto text-[var(--text-secondary)] mb-4" />
        <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
          {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          {accept} up to {maxSize}MB • Maximum {maxFiles} files
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-3 p-3 bg-[var(--panel)] border border-[var(--border)] rounded-lg"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {uploadFile.status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : uploadFile.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-[var(--error)]" />
                ) : (
                  <File className="w-5 h-5 text-[var(--text-secondary)]" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {uploadFile.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--text-secondary)]">
                    {formatFileSize(uploadFile.file.size)}
                  </span>
                  {uploadFile.status === 'uploading' && (
                    <span className="text-xs text-[var(--accent-gold)]">
                      {uploadFile.progress}%
                    </span>
                  )}
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <span className="text-xs text-[var(--error)]">
                      {uploadFile.error}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {uploadFile.status === 'uploading' && (
                  <div className="w-full h-1.5 bg-[var(--background)] rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-gold)] transition-all duration-300"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeFile(uploadFile.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-[var(--background)] transition-colors"
                disabled={uploadFile.status === 'uploading'}
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
