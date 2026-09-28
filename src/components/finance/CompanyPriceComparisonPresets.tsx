'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import { Bookmark, BookmarkPlus, Pencil, Trash2 } from 'lucide-react';
import { Button, Modal, toast } from '@/components/design-system';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';
import {
  deleteComparisonPreset,
  loadComparisonPresets,
  saveComparisonPreset,
  updateComparisonPreset,
  type ComparisonPreset,
  type ComparisonPresetConfig,
} from '@/lib/company-price-comparison-presets';

type CompanyPriceComparisonPresetsProps = {
  currentConfig: ComparisonPresetConfig;
  onApply: (config: ComparisonPresetConfig) => void;
};

export default function CompanyPriceComparisonPresets({
  currentConfig,
  onApply,
}: CompanyPriceComparisonPresetsProps) {
  const confirmAction = useConfirmAction();
  const [presets, setPresets] = useState<ComparisonPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const refreshPresets = () => {
    setPresets(loadComparisonPresets());
  };

  useEffect(() => {
    refreshPresets();
  }, []);

  const handleOpenSaveDialog = (preset?: ComparisonPreset) => {
    setEditingPresetId(preset?.id || null);
    setPresetName(preset?.name || '');
    setOpenSaveDialog(true);
  };

  const handleSavePreset = () => {
    try {
      if (editingPresetId) {
        updateComparisonPreset(editingPresetId, {
          name: presetName,
          config: currentConfig,
        });
        toast.success('Preset updated');
      } else {
        const preset = saveComparisonPreset(presetName, currentConfig);
        setSelectedPresetId(preset.id);
        toast.success('Preset saved');
      }

      refreshPresets();
      setOpenSaveDialog(false);
      setPresetName('');
      setEditingPresetId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save preset');
    }
  };

  const handleApplyPreset = () => {
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) {
      toast.error('Select a preset to load');
      return;
    }

    onApply(preset.config);
    toast.success(`Loaded "${preset.name}"`);
  };

  const handleDeletePreset = async (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    const confirmed = await confirmAction({
      title: 'Delete Preset',
      message: `Delete preset "${preset.name}"?`,
      confirmText: 'Delete',
      severity: 'error',
    });
    if (!confirmed) return;

    deleteComparisonPreset(presetId);
    if (selectedPresetId === presetId) setSelectedPresetId('');
    refreshPresets();
    toast.success('Preset deleted');
  };

  return (
    <>
      <Box sx={{ p: 1.5, borderRadius: 2, border: '1px solid var(--border)', background: 'var(--panel)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Bookmark className="w-4 h-4" />
            <Box sx={{ fontWeight: 700 }}>Saved Comparison Presets</Box>
          </Box>
          <Button variant="outline" size="sm" icon={<BookmarkPlus className="w-4 h-4" />} onClick={() => handleOpenSaveDialog()}>
            Save Current
          </Button>
        </Box>

        {presets.length === 0 ? (
          <Box sx={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            Save your company selection, filters, and view settings to reload common comparisons quickly.
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' }, gap: 1, alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Saved preset"
              value={selectedPresetId}
              onChange={(event) => setSelectedPresetId(event.target.value)}
            >
              <MenuItem value="">Select a preset</MenuItem>
              {presets.map((preset) => (
                <MenuItem key={preset.id} value={preset.id}>
                  {preset.name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Button variant="primary" size="sm" onClick={handleApplyPreset} disabled={!selectedPresetId}>
                Load
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const preset = presets.find((item) => item.id === selectedPresetId);
                  if (preset) handleOpenSaveDialog(preset);
                }}
                disabled={!selectedPresetId}
              >
                Update
              </Button>
            </Box>
          </Box>
        )}

        {presets.length > 0 && (
          <Box sx={{ display: 'grid', gap: 0.75, mt: 1.25 }}>
            {presets.slice(0, 5).map((preset) => (
              <Box
                key={preset.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 1,
                  alignItems: 'center',
                  p: 1,
                  borderRadius: 1.5,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ fontWeight: 600, fontSize: '0.84rem' }}>{preset.name}</Box>
                  <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {preset.config.selectedCompanyIds.length} companies • {preset.config.viewMode.replace('-', ' ')} • updated {new Date(preset.updatedAt).toLocaleString()}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  <Tooltip title="Load preset">
                    <IconButton size="small" onClick={() => onApply(preset.config)}>
                      <Bookmark className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Rename / update preset">
                    <IconButton size="small" onClick={() => handleOpenSaveDialog(preset)}>
                      <Pencil className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete preset">
                    <IconButton size="small" color="error" onClick={() => handleDeletePreset(preset.id)}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Modal
        open={openSaveDialog}
        onClose={() => setOpenSaveDialog(false)}
        title={editingPresetId ? 'Update Preset' : 'Save Comparison Preset'}
        size="sm"
        actions={
          <>
            <Button variant="outline" onClick={() => setOpenSaveDialog(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSavePreset} disabled={!presetName.trim()}>
              {editingPresetId ? 'Update' : 'Save'}
            </Button>
          </>
        }
      >
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Preset name"
          value={presetName}
          onChange={(event) => setPresetName(event.target.value)}
          placeholder="e.g. Shipping carriers - West Coast lanes"
        />
      </Modal>
    </>
  );
}