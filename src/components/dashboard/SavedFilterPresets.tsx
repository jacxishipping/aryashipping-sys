'use client';

import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
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
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
        py: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
        <Bookmark size={14} style={{ color: 'var(--accent-gold)' }} />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Saved Views:
        </Typography>
      </Box>

      {presets.map((preset) => {
        const isActive = activePresetId === preset.id;
        return (
          <Box
            key={preset.id}
            onClick={() => {
              setActivePresetId(preset.id);
              onApplyPreset(preset.filters);
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              px: 1.25,
              py: 0.4,
              borderRadius: 2,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
              backgroundColor: isActive ? 'var(--accent-gold)' : 'var(--panel)',
              color: isActive ? '#000000' : 'var(--text-primary)',
              border: isActive ? '1px solid var(--accent-gold)' : '1px solid var(--border)',
              '&:hover': {
                borderColor: 'var(--accent-gold)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <span>{preset.name}</span>
            {!preset.isDefault && (
              <Box
                component="span"
                onClick={(e) => handleDeletePreset(preset.id, e)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  p: 0.25,
                  borderRadius: 1,
                  opacity: 0.7,
                  '&:hover': { opacity: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
                }}
              >
                <X size={12} />
              </Box>
            )}
          </Box>
        );
      })}

      {isAdding ? (
        <form onSubmit={handleSaveCurrent} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            type="text"
            placeholder="View name..."
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            autoFocus
            style={{
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--accent-gold)',
              backgroundColor: 'var(--background)',
              color: 'var(--text-primary)',
              outline: 'none',
              width: 120,
            }}
          />
          <Button type="submit" variant="primary" size="sm" icon={<Check size={12} />} sx={{ px: 1, py: 0.25 }}>
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(false)}
            icon={<X size={12} />}
            sx={{ px: 1, py: 0.25 }}
          />
        </form>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          icon={<Plus size={12} />}
          sx={{
            fontSize: '0.72rem',
            py: 0.4,
            px: 1,
            height: 'auto',
            borderRadius: 2,
            borderStyle: 'dashed',
          }}
        >
          Save Current Filter
        </Button>
      )}
    </Box>
  );
}
