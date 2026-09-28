'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Box, MenuItem, TextField } from '@mui/material';
import { Button, Modal } from '@/components/design-system';
import AddShipmentExpenseModal from '@/components/shipments/AddShipmentExpenseModal';
import PhotoLightbox from '@/components/shipments/PhotoLightbox';
import type {
  AvailableDispatchOption,
  AvailableTransitOption,
  ExpenseActionContext,
  ShipmentPhotoLightboxState,
} from '@/components/shipments/shipment-detail-types';

type ShipmentDetailOverlaysProps = {
  lightbox: ShipmentPhotoLightboxState;
  canDeleteArrivalLightbox: boolean;
  downloading: boolean;
  onCloseLightbox: () => void;
  onNavigateLightbox: (index: number) => void;
  onDeleteFromLightbox?: (index: number) => void | Promise<void>;
  onDownloadPhoto: (url: string, index: number) => void | Promise<void>;
  onDownloadAllPhotos: (urls: string[], label: string) => void | Promise<void>;
  canManageWorkflow: boolean;
  openAssignDispatch: boolean;
  onCloseAssignDispatch: () => void;
  loadingDispatches: boolean;
  assigningDispatch: boolean;
  availableDispatches: AvailableDispatchOption[];
  dispatchIdToAssign: string;
  onDispatchIdChange: (value: string) => void;
  onAssignDispatch: () => void | Promise<void>;
  openAssignTransit: boolean;
  onCloseAssignTransit: () => void;
  loadingTransits: boolean;
  assigningTransit: boolean;
  availableTransits: AvailableTransitOption[];
  transitIdToAssign: string;
  onTransitIdChange: (value: string) => void;
  releaseTokenToAssign: string;
  onReleaseTokenChange: (value: string) => void;
  showReleaseToken: boolean;
  onToggleReleaseToken: () => void;
  onAssignTransit: () => void | Promise<void>;
  shipmentId: string | null;
  expenseAction: ExpenseActionContext | null;
  onCloseExpenseAction: () => void;
  onExpenseSuccess: () => void;
};

export default function ShipmentDetailOverlays({
  lightbox,
  canDeleteArrivalLightbox,
  downloading,
  onCloseLightbox,
  onNavigateLightbox,
  onDeleteFromLightbox,
  onDownloadPhoto,
  onDownloadAllPhotos,
  canManageWorkflow,
  openAssignDispatch,
  onCloseAssignDispatch,
  loadingDispatches,
  assigningDispatch,
  availableDispatches,
  dispatchIdToAssign,
  onDispatchIdChange,
  onAssignDispatch,
  openAssignTransit,
  onCloseAssignTransit,
  loadingTransits,
  assigningTransit,
  availableTransits,
  transitIdToAssign,
  onTransitIdChange,
  releaseTokenToAssign,
  onReleaseTokenChange,
  showReleaseToken,
  onToggleReleaseToken,
  onAssignTransit,
  shipmentId,
  expenseAction,
  onCloseExpenseAction,
  onExpenseSuccess,
}: ShipmentDetailOverlaysProps) {
  return (
    <>
      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          index={lightbox.index}
          title={lightbox.title}
          canDelete={canDeleteArrivalLightbox}
          onClose={onCloseLightbox}
          onNavigate={onNavigateLightbox}
          onDelete={onDeleteFromLightbox ? (index) => Promise.resolve(onDeleteFromLightbox(index)) : undefined}
          onDownload={(url, index) => Promise.resolve(onDownloadPhoto(url, index))}
          onDownloadAll={(urls) => Promise.resolve(onDownloadAllPhotos(urls, lightbox.title))}
          downloading={downloading}
        />
      )}

      {canManageWorkflow && (
        <Modal
          open={openAssignDispatch}
          onClose={() => !assigningDispatch && onCloseAssignDispatch()}
          size="sm"
          title="Assign Shipment to Dispatch"
          description="Choose a pending dispatch route for this shipment."
          showCloseButton={!assigningDispatch}
          disableBackdropClick={assigningDispatch}
          actions={
            <>
              <Button variant="outline" onClick={onCloseAssignDispatch} disabled={assigningDispatch}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void onAssignDispatch()}
                disabled={assigningDispatch || loadingDispatches || !dispatchIdToAssign}
              >
                {assigningDispatch ? 'Assigning...' : 'Assign'}
              </Button>
            </>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              fullWidth
              label="Dispatch"
              value={dispatchIdToAssign}
              onChange={(event) => onDispatchIdChange(event.target.value)}
              helperText={loadingDispatches ? 'Loading pending dispatches...' : 'Select a dispatch route for this shipment'}
              size="small"
              disabled={loadingDispatches || assigningDispatch}
            >
              {availableDispatches.map((dispatch) => (
                <MenuItem key={dispatch.id} value={dispatch.id}>
                  {dispatch.referenceNumber} - {dispatch.company.name} ({dispatch.origin} → {dispatch.destination})
                </MenuItem>
              ))}
            </TextField>
            {!loadingDispatches && availableDispatches.length === 0 && (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">No pending dispatches are available.</p>
            )}
          </Box>
        </Modal>
      )}

      {canManageWorkflow && (
        <Modal
          open={openAssignTransit}
          onClose={() => !assigningTransit && onCloseAssignTransit()}
          size="sm"
          title="Assign Shipment to Transit"
          description="Choose an open transit for this shipment. The release token is pre-filled for verification."
          showCloseButton={!assigningTransit}
          disableBackdropClick={assigningTransit}
          actions={
            <>
              <Button variant="outline" onClick={onCloseAssignTransit} disabled={assigningTransit}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void onAssignTransit()}
                disabled={assigningTransit || loadingTransits || !transitIdToAssign}
              >
                {assigningTransit ? 'Assigning...' : 'Assign'}
              </Button>
            </>
          }
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              select
              fullWidth
              label="Transit"
              value={transitIdToAssign}
              onChange={(event) => onTransitIdChange(event.target.value)}
              helperText={loadingTransits ? 'Loading open transits...' : 'Select the transit this shipment will travel on'}
              size="small"
              disabled={loadingTransits || assigningTransit}
            >
              {availableTransits.map((transit) => (
                <MenuItem key={transit.id} value={transit.id}>
                  {transit.referenceNumber}
                  {transit.currentCompany ? ` - ${transit.currentCompany.name}` : ''} ({transit.origin} → {transit.destination})
                </MenuItem>
              ))}
            </TextField>
            {!loadingTransits && availableTransits.length === 0 && (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">No open transits are available. Create one from the Transits page first.</p>
            )}
            <TextField
              fullWidth
              label="Release Token"
              type={showReleaseToken ? 'text' : 'password'}
              value={releaseTokenToAssign}
              onChange={(event) => onReleaseTokenChange(event.target.value)}
              helperText="Auto-filled from this shipment — the token is verified before assigning"
              size="small"
              InputProps={{
                endAdornment: (
                  <button
                    type="button"
                    onClick={onToggleReleaseToken}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showReleaseToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                ),
              }}
            />
          </Box>
        </Modal>
      )}

      {shipmentId && (
        <AddShipmentExpenseModal
          open={Boolean(expenseAction)}
          onClose={onCloseExpenseAction}
          shipmentId={shipmentId}
          modalTitle={expenseAction?.modalTitle}
          contextType={expenseAction?.contextType}
          contextId={expenseAction?.contextId}
          onSuccess={onExpenseSuccess}
        />
      )}
    </>
  );
}