/**
 * Tax calculation utilities
 * Handles various tax scenarios for shipping invoices
 */

export interface TaxConfig {
  region: string; // e.g., "US", "EU", "UAE"
  taxRate: number; // Percentage (e.g., 7.5 for 7.5%)
  taxName: string; // e.g., "Sales Tax", "VAT", "GST"
  taxType: "SALES_TAX" | "VAT" | "GST" | "CUSTOM_DUTY";
  applicableToShipping: boolean;
  applicableToGoods: boolean;
}

// Default tax configurations by region
export const DEFAULT_TAX_CONFIGS: Record<string, TaxConfig> = {
  US_CA: {
    region: "California, US",
    taxRate: 7.25,
    taxName: "Sales Tax",
    taxType: "SALES_TAX",
    applicableToShipping: false,
    applicableToGoods: true,
  },
  US_TX: {
    region: "Texas, US",
    taxRate: 6.25,
    taxName: "Sales Tax",
    taxType: "SALES_TAX",
    applicableToShipping: false,
    applicableToGoods: true,
  },
  US_FL: {
    region: "Florida, US",
    taxRate: 6.0,
    taxName: "Sales Tax",
    taxType: "SALES_TAX",
    applicableToShipping: false,
    applicableToGoods: true,
  },
  EU: {
    region: "European Union",
    taxRate: 20.0,
    taxName: "VAT",
    taxType: "VAT",
    applicableToShipping: true,
    applicableToGoods: true,
  },
  UAE: {
    region: "United Arab Emirates",
    taxRate: 5.0,
    taxName: "VAT",
    taxType: "VAT",
    applicableToShipping: true,
    applicableToGoods: true,
  },
  NONE: {
    region: "No Tax",
    taxRate: 0,
    taxName: "No Tax",
    taxType: "SALES_TAX",
    applicableToShipping: false,
    applicableToGoods: false,
  },
};

export interface TaxCalculationInput {
  subtotal: number;
  shippingAmount?: number;
  taxConfig: TaxConfig;
  isB2B?: boolean; // Business-to-business (may be tax exempt)
}

export interface TaxCalculationResult {
  subtotal: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  breakdown: {
    goodsTax: number;
    shippingTax: number;
  };
  taxRate: number;
  taxName: string;
}

/**
 * Calculate tax for an invoice
 */
export function calculateTax(input: TaxCalculationInput): TaxCalculationResult {
  const { subtotal, shippingAmount = 0, taxConfig, isB2B = false } = input;

  // B2B transactions in EU may be reverse-charged (0% VAT)
  if (isB2B && taxConfig.taxType === "VAT") {
    return {
      subtotal,
      taxableAmount: 0,
      taxAmount: 0,
      total: subtotal + shippingAmount,
      breakdown: {
        goodsTax: 0,
        shippingTax: 0,
      },
      taxRate: 0,
      taxName: `${taxConfig.taxName} (Reverse Charge)`,
    };
  }

  // Calculate taxable amounts
  const taxableGoods = taxConfig.applicableToGoods ? subtotal : 0;
  const taxableShipping = taxConfig.applicableToShipping ? shippingAmount : 0;
  const taxableAmount = taxableGoods + taxableShipping;

  // Calculate tax
  const taxRate = taxConfig.taxRate / 100;
  const goodsTax = taxableGoods * taxRate;
  const shippingTax = taxableShipping * taxRate;
  const taxAmount = goodsTax + shippingTax;

  const total = subtotal + shippingAmount + taxAmount;

  return {
    subtotal,
    taxableAmount,
    taxAmount: Number(taxAmount.toFixed(2)),
    total: Number(total.toFixed(2)),
    breakdown: {
      goodsTax: Number(goodsTax.toFixed(2)),
      shippingTax: Number(shippingTax.toFixed(2)),
    },
    taxRate: taxConfig.taxRate,
    taxName: taxConfig.taxName,
  };
}

/**
 * Get tax configuration by region code
 */
export function getTaxConfig(regionCode: string): TaxConfig {
  return DEFAULT_TAX_CONFIGS[regionCode] || DEFAULT_TAX_CONFIGS.NONE;
}

/**
 * Calculate custom duty (for international shipments)
 */
export interface CustomDutyInput {
  vehicleValue: number;
  dutyRate: number; // Percentage
  includeShipping: boolean;
  shippingCost?: number;
}

export function calculateCustomDuty(input: CustomDutyInput): number {
  const { vehicleValue, dutyRate, includeShipping, shippingCost = 0 } = input;

  const dutyableValue = includeShipping ? vehicleValue + shippingCost : vehicleValue;
  const duty = dutyableValue * (dutyRate / 100);

  return Number(duty.toFixed(2));
}

/**
 * Format tax for display
 */
export function formatTaxLine(tax: TaxCalculationResult): string {
  if (tax.taxAmount === 0) {
    return "No tax";
  }
  return `${tax.taxName} (${tax.taxRate}%): $${tax.taxAmount.toFixed(2)}`;
}

/**
 * Validate tax configuration
 */
export function validateTaxConfig(config: TaxConfig): boolean {
  if (config.taxRate < 0 || config.taxRate > 100) {
    return false;
  }
  if (!config.taxName || config.taxName.trim() === "") {
    return false;
  }
  return true;
}
