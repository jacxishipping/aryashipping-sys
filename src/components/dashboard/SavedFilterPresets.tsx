'use client';

import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/design-system';

export interface FilterPreset<T = Record<string, any>> {
  id: string;
  name: string;
  filters: T;
  isDefault?: boolean;
}

interface SavedFilterPresetsProps<T extends Record<string, any>> {
  storageKey: string;
  currentFilters: T;
  onApplyPreset: (filters: T) => void;
  defaultPresets?: FilterPreset<T>[];
}

const EMPTY_DEFAULT_PRESETS: FilterPreset<any>[] = [];

export function SavedFilterPresets<T extends Record<string, any>>({
  storageKey,
  currentFilters,
  onApplyPreset,
  defaultPresets = EMPTY_DEFAULT_PRESETS,
}: SavedFilterPresetsProps<T>) {
  const [presets, setPresets] = useState<FilterPreset<T>[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Load presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`jacxi_filter_presets_${storageKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const userCustomPresets = Array.isArray(parsed)
          ? parsed.filter((p: FilterPreset<T>) => !p.isDefault)
          : [];
        setPresets([...defaultPresets, ...userCustomPresets]);
      } else {
        setPresets(defaultPresets);
      }
    } catch {
      setPresets(defaultPresets);
    }
  }, [storageKey, defaultPresets]);

  // Save to localStorage
  const persistPresets = (newPresets: FilterPreset<T>[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem(`jacxi_filter_presets_${storageKey}`, JSON.stringify(newPresets));
    } catch {
      // ignore
    }
  };

  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: FilterPreset<T> = {
      id: `preset_${Date.now()}`,
      name: newPresetName.trim(),
      filters: currentFilters,
    };

    const updated = [...presets, newPreset];
    persistPresets(updated);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setIsAdding(false);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = presets.filter((p) => p.id !== id);
    persistPresets(updated);
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap py-1">
      <div className="flex items-center gap-1.5 mr-1">
        <Bookmark size={14} className="text-[var(--accent-gold)]" />
        <span className="text-xs font-bold text-[var(--text-secondary)]">
          Saved Views:
        </span>
      </div>

      {presets.map((preset) => {
        const isActive = activePresetId === preset.id;
        return (
          <div
            key={preset.id}
            onClick={() => {
              setActivePresetId(preset.id);
              onApplyPreset(preset.filters);
            }}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
              isActive
                ? 'bg-[var(--accent-gold)] text-black border-[var(--accent-gold)]'
                : 'bg-[var(--panel)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--accent-gold)] hover:-translate-y-0.5'
            }`}
          >
            <span>{preset.name}</span>
            {!preset.isDefault && (
              <button
                type="button"
                onClick={(e) => handleDeletePreset(preset.id, e)}
                className="inline-flex items-center p-0.5 rounded opacity-70 hover:opacity-100 hover:bg-black/10 bg-transparent border-0 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}

      {isAdding ? (
        <form onSubmit={handleSaveCurrent} className="inline-flex items-center gap-1">
          <input
            type="text"
            placeholder="View name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            autoFocus
            className="text-xs px-2 py-1 rounded-md border border-[var(--accent-gold)] bg-[var(--background)] text-[var(--text-primary)] outline-none w-28"
          />
          <Button type="submit" variant="primary" size="sm" icon={<Check size={12} />}>
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(false)}
            icon={<X size={12} />}
          />
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          icon={<Plus size={12} />}
          className="text-xs border-dashed"
        >
          Save Current Filter
        </Button>
      )}
    </div>
  );
}
