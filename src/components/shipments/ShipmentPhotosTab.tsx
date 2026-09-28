'use client';

import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import PhotoGallery from '@/components/shipments/PhotoGallery';
import Vehicle360Viewer from '@/components/shipments/Vehicle360Viewer';

type UploadProgressItem = {
  name: string;
  progress: number;
};

type ShipmentPhotosTabProps = {
  vehicleLabel: string;
  vehiclePhotos: string[];
  arrivalPhotos: string[];
  canUploadArrivalPhotos: boolean;
  uploading: boolean;
  uploadProgress: UploadProgressItem[];
  onVehiclePhotoClick: (index: number) => void;
  onArrivalPhotoClick: (index: number) => void;
  onDownloadSingle: (url: string, index: number) => void;
  onDownloadAll: (urls: string[], label: string) => void;
  onUploadArrivalPhotos: (files: File[]) => void | Promise<void>;
  onRemoveArrivalPhoto: (index: number) => void | Promise<void>;
};

export default function ShipmentPhotosTab({
  vehicleLabel,
  vehiclePhotos,
  arrivalPhotos,
  canUploadArrivalPhotos,
  uploading,
  uploadProgress,
  onVehiclePhotoClick,
  onArrivalPhotoClick,
  onDownloadSingle,
  onDownloadAll,
  onUploadArrivalPhotos,
  onRemoveArrivalPhoto,
}: ShipmentPhotosTabProps) {
  return (
    <div className="space-y-6">
      <DashboardPanel title={`Vehicle Photos${vehiclePhotos.length ? ` (${vehiclePhotos.length})` : ''}`}>
        <div className="space-y-4">
          {vehiclePhotos.length > 0 && (
            <Vehicle360Viewer
              photos={vehiclePhotos}
              vehicleLabel={vehicleLabel}
              onOpenFrame={onVehiclePhotoClick}
            />
          )}

          <PhotoGallery
            photos={vehiclePhotos.map((url) => ({ url, label: 'Vehicle' }))}
            onPhotoClick={onVehiclePhotoClick}
            onDownloadSingle={(url, index) => Promise.resolve(onDownloadSingle(url, index))}
            onDownloadAll={(urls) => Promise.resolve(onDownloadAll(urls, 'Vehicle Photos'))}
          />
        </div>
      </DashboardPanel>

      <DashboardPanel title={`Arrival Photos${arrivalPhotos.length ? ` (${arrivalPhotos.length})` : ''}`}>
        <PhotoGallery
          photos={arrivalPhotos.map((url) => ({ url, label: 'Arrival' }))}
          onPhotoClick={onArrivalPhotoClick}
          onDownloadSingle={(url, index) => Promise.resolve(onDownloadSingle(url, index))}
          onDownloadAll={(urls) => Promise.resolve(onDownloadAll(urls, 'Arrival Photos'))}
          canUpload={canUploadArrivalPhotos}
          onUpload={(files) => Promise.resolve(onUploadArrivalPhotos(files))}
          onDelete={canUploadArrivalPhotos ? (index) => Promise.resolve(onRemoveArrivalPhoto(index)) : undefined}
          uploading={uploading}
          uploadProgress={uploadProgress}
          uploadLabel="Add Arrival Photos"
        />
      </DashboardPanel>
    </div>
  );
}