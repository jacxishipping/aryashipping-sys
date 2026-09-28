'use client';

import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { DocumentManager } from '@/components/dashboard/DocumentManager';

type ShipmentDocument = {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  isPublic?: boolean;
  uploadedBy: string;
  createdAt: string;
};

type ShipmentDocumentsTabProps = {
  documents: ShipmentDocument[];
  shipmentId: string;
  readOnly: boolean;
  onDocumentsChange: () => void;
};

export default function ShipmentDocumentsTab({
  documents,
  shipmentId,
  readOnly,
  onDocumentsChange,
}: ShipmentDocumentsTabProps) {
  return (
    <DashboardPanel title="Shipment Documents" description="Manage all documents related to this shipment">
      <DocumentManager
        documents={documents.map((document) => ({
          ...document,
          type: document.fileType,
          size: document.fileSize,
          url: document.fileUrl,
          category: document.category || 'OTHER',
        }))}
        entityId={shipmentId}
        entityType="shipment"
        readOnly={readOnly}
        onDocumentsChange={onDocumentsChange}
      />
    </DashboardPanel>
  );
}