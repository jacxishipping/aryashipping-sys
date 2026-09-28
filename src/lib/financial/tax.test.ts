import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  validateTaxConfig,
  calculateTax,
  getTaxConfig,
  calculateCustomDuty,
  formatTaxLine,
  DEFAULT_TAX_CONFIGS
} from './tax.ts';
import type { TaxConfig } from './tax.ts';

describe('Tax Validation', () => {
  test('validateTaxConfig returns true for valid config', () => {
    const config: TaxConfig = {
      region: 'Test',
      taxRate: 10,
      taxName: 'Test Tax',
      taxType: 'SALES_TAX',
      applicableToShipping: true,
      applicableToGoods: true
    };
    assert.strictEqual(validateTaxConfig(config), true);
  });

  test('validateTaxConfig returns false for taxRate < 0', () => {
    const config: TaxConfig = {
      region: 'Test',
      taxRate: -1,
      taxName: 'Test Tax',
      taxType: 'SALES_TAX',
      applicableToShipping: true,
      applicableToGoods: true
    };
    assert.strictEqual(validateTaxConfig(config), false);
  });

  test('validateTaxConfig returns false for taxRate > 100', () => {
    const config: TaxConfig = {
      region: 'Test',
      taxRate: 101,
      taxName: 'Test Tax',
      taxType: 'SALES_TAX',
      applicableToShipping: true,
      applicableToGoods: true
    };
    assert.strictEqual(validateTaxConfig(config), false);
  });

  test('validateTaxConfig returns false for empty taxName', () => {
    const config: TaxConfig = {
      region: 'Test',
      taxRate: 10,
      taxName: '',
      taxType: 'SALES_TAX',
      applicableToShipping: true,
      applicableToGoods: true
    };
    assert.strictEqual(validateTaxConfig(config), false);
  });

  test('validateTaxConfig returns false for whitespace taxName', () => {
    const config: TaxConfig = {
      region: 'Test',
      taxRate: 10,
      taxName: '   ',
      taxType: 'SALES_TAX',
      applicableToShipping: true,
      applicableToGoods: true
    };
    assert.strictEqual(validateTaxConfig(config), false);
  });
});

describe('Tax Calculation', () => {
  test('calculateTax handles standard sales tax correctly', () => {
    const input = {
      subtotal: 1000,
      shippingAmount: 500,
      taxConfig: DEFAULT_TAX_CONFIGS.US_CA, // 7.25%, only goods
    };
    const result = calculateTax(input);
    assert.strictEqual(result.subtotal, 1000);
    assert.strictEqual(result.taxableAmount, 1000);
    assert.strictEqual(result.taxAmount, 72.5);
    assert.strictEqual(result.total, 1572.5);
    assert.strictEqual(result.breakdown.goodsTax, 72.5);
    assert.strictEqual(result.breakdown.shippingTax, 0);
  });

  test('calculateTax handles VAT (applicable to both) correctly', () => {
    const input = {
      subtotal: 1000,
      shippingAmount: 500,
      taxConfig: DEFAULT_TAX_CONFIGS.EU, // 20%, both goods and shipping
    };
    const result = calculateTax(input);
    assert.strictEqual(result.taxableAmount, 1500);
    assert.strictEqual(result.taxAmount, 300);
    assert.strictEqual(result.total, 1800);
    assert.strictEqual(result.breakdown.goodsTax, 200);
    assert.strictEqual(result.breakdown.shippingTax, 100);
  });

  test('calculateTax handles B2B VAT exemption (reverse charge)', () => {
    const input = {
      subtotal: 1000,
      shippingAmount: 500,
      taxConfig: DEFAULT_TAX_CONFIGS.EU,
      isB2B: true
    };
    const result = calculateTax(input);
    assert.strictEqual(result.taxAmount, 0);
    assert.strictEqual(result.total, 1500);
    assert.match(result.taxName, /Reverse Charge/);
  });

  test('calculateTax handles NONE tax config', () => {
    const input = {
      subtotal: 1000,
      shippingAmount: 500,
      taxConfig: DEFAULT_TAX_CONFIGS.NONE,
    };
    const result = calculateTax(input);
    assert.strictEqual(result.taxAmount, 0);
    assert.strictEqual(result.total, 1500);
  });
});

describe('Tax Configuration Retrieval', () => {
  test('getTaxConfig returns correct config for valid code', () => {
    const config = getTaxConfig('US_CA');
    assert.strictEqual(config.region, 'California, US');
    assert.strictEqual(config.taxRate, 7.25);
  });

  test('getTaxConfig returns NONE config for invalid code', () => {
    const config = getTaxConfig('INVALID_CODE');
    assert.strictEqual(config.region, 'No Tax');
    assert.strictEqual(config.taxRate, 0);
  });
});

describe('Custom Duty Calculation', () => {
  test('calculateCustomDuty without shipping cost', () => {
    const duty = calculateCustomDuty({
      vehicleValue: 10000,
      dutyRate: 5,
      includeShipping: false
    });
    assert.strictEqual(duty, 500);
  });

  test('calculateCustomDuty with shipping cost', () => {
    const duty = calculateCustomDuty({
      vehicleValue: 10000,
      dutyRate: 5,
      includeShipping: true,
      shippingCost: 2000
    });
    assert.strictEqual(duty, 600);
  });
});

describe('Tax Formatting', () => {
  test('formatTaxLine for zero tax', () => {
    const taxRes = calculateTax({
      subtotal: 1000,
      taxConfig: DEFAULT_TAX_CONFIGS.NONE
    });
    assert.strictEqual(formatTaxLine(taxRes), 'No tax');
  });

  test('formatTaxLine for positive tax', () => {
    const taxRes = calculateTax({
      subtotal: 1000,
      taxConfig: DEFAULT_TAX_CONFIGS.UAE
    });
    assert.strictEqual(formatTaxLine(taxRes), 'VAT (5%): $50.00');
  });
});
