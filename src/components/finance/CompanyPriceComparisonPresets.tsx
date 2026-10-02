'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookmarkPlus, Pencil, Trash2 } from 'lucide-react';
import { Button, FormField, Modal, Select, Tooltip, toast } from '@/components/design-system';
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
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--panel)]">
        <div className="flex justify-between gap-2 items-center flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[var(--accent-gold)]" />
            <span className="font-bold text-sm text-[var(--text-primary)]">Saved Comparison Presets</span>
          </div>
          <Button variant="outline" size="sm" icon={<BookmarkPlus className="w-4 h-4" />} onClick={() => handleOpenSaveDialog()}>
            Save Current
          </Button>
        </div>

        {presets.length === 0 ? (
          <div className="text-xs text-[var(--text-secondary)]">
            Save your company selection, filters, and view settings to reload common comparisons quickly.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
            <Select
              size="small"
              label="Saved preset"
              value={selectedPresetId}
              onChange={(value) => setSelectedPresetId(String(value))}
              options={[
                { value: '', label: 'Select a preset' },
                ...presets.map((preset) => ({ value: preset.id, label: preset.name })),
              ]}
            />
            <div className="flex gap-2 flex-wrap">
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
            </div>
          </div>
        )}

        {presets.length > 0 && (
          <div className="grid gap-2 mt-3">
            {presets.slice(0, 5).map((preset) => (
              <div
                key={preset.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-center p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)]"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-[var(--text-primary)]">{preset.name}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {preset.config.selectedCompanyIds.length} companies • {preset.config.viewMode.replace('-', ' ')} • updated {new Date(preset.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Tooltip title="Load preset">
                    <button
                      type="button"
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--accent-gold-rgb),0.1)]"
                      onClick={() => onApply(preset.config)}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip title="Rename / update preset">
                    <button
                      type="button"
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(var(--accent-gold-rgb),0.1)]"
                      onClick={() => handleOpenSaveDialog(preset)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip title="Delete preset">
                    <button
                      type="button"
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDeletePreset(preset.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
        <div className="pt-2">
          <FormField
            autoFocus
            label="Preset name"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
            placeholder="e.g. Shipping carriers - West Coast lanes"
          />
        </div>
      </Modal>
    </>
  );
}