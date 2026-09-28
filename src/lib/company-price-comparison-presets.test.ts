import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COMPARISON_PRESETS_STORAGE_KEY,
  createDefaultComparisonPresetConfig,
  deleteComparisonPreset,
  loadComparisonPresets,
  sanitizePresetConfigForCompanies,
  saveComparisonPreset,
  updateComparisonPreset,
} from './company-price-comparison-presets.ts';

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe('company price comparison presets', () => {
  it('saves, updates, loads, and deletes presets', () => {
    const storage = new MemoryStorage();
    const config = {
      ...createDefaultComparisonPresetConfig(),
      selectedCompanyIds: ['company-a', 'company-b'],
      viewMode: 'side-by-side' as const,
      sideBySideLeftId: 'company-a',
      sideBySideRightId: 'company-b',
    };

    const saved = saveComparisonPreset('West Coast duel', config, storage);
    assert.equal(saved.name, 'West Coast duel');

    let presets = loadComparisonPresets(storage);
    assert.equal(presets.length, 1);
    assert.equal(presets[0].config.viewMode, 'side-by-side');

    updateComparisonPreset(saved.id, { name: 'Updated duel', config }, storage);
    presets = loadComparisonPresets(storage);
    assert.equal(presets[0].name, 'Updated duel');

    deleteComparisonPreset(saved.id, storage);
    presets = loadComparisonPresets(storage);
    assert.equal(presets.length, 0);
    assert.equal(storage.getItem(COMPARISON_PRESETS_STORAGE_KEY), '[]');
  });

  it('sanitizes unavailable company ids from preset config', () => {
    const sanitized = sanitizePresetConfigForCompanies({
      ...createDefaultComparisonPresetConfig(),
      selectedCompanyIds: ['company-a', 'missing'],
      sideBySideLeftId: 'company-a',
      sideBySideRightId: 'missing',
      referenceCompanyId: 'missing',
    }, ['company-a', 'company-b']);

    assert.deepEqual(sanitized.selectedCompanyIds, ['company-a']);
    assert.equal(sanitized.sideBySideLeftId, 'company-a');
    assert.equal(sanitized.sideBySideRightId, '');
    assert.equal(sanitized.referenceCompanyId, '');
  });
});