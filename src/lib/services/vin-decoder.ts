/**
 * VIN Decoder Service
 * Decodes Vehicle Identification Numbers using the NHTSA VIN decoder API
 */

export interface VINDecoderResult {
  make?: string;
  model?: string;
  year?: string;
  bodyClass?: string;
  vehicleType?: string;
  gvwr?: string; // Gross Vehicle Weight Rating
  gvwrRange?: string;
  curbWeight?: string;
  color?: string;
  engineCylinders?: string;
  engineDisplacement?: string;
  engineHP?: string;
  fuelType?: string;
  transmissionStyle?: string;
  driveType?: string;
  doors?: string;
  manufacturer?: string;
  plantCountry?: string;
  error?: string;
}

interface NHTSAResult {
  Variable: string;
  Value: string | null;
  ValueId: string | null;
}

interface NHTSAResponse {
  Count: number;
  Message: string;
  Results: NHTSAResult[];
  SearchCriteria: string;
}

/**
 * Extract value from NHTSA API results by variable name
 */
function extractValue(results: NHTSAResult[], variableName: string): string | undefined {
  const result = results.find((r) => r.Variable === variableName);
  return result?.Value && result.Value !== 'Not Applicable' && result.Value !== '' 
    ? result.Value 
    : undefined;
}

/**
 * Convert weight string to number (removes "lbs" and converts to float)
 */
function parseWeight(weightStr: string | undefined): number | undefined {
  if (!weightStr) return undefined;
  
  // Remove common weight units and parse
  const cleaned = weightStr.replace(/[,\s]*(lbs|pounds|kg|kilograms)/gi, '').trim();
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Decode VIN using NHTSA API
 * @param vin - 17-character Vehicle Identification Number
 * @returns Decoded vehicle information
 */
export async function decodeVIN(vin: string): Promise<VINDecoderResult> {
  if (!vin || vin.length !== 17) {
    throw new Error('VIN must be exactly 17 characters');
  }

  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: NHTSAResponse = await response.json();

    if (!data.Results || data.Results.length === 0) {
      throw new Error('No results returned from VIN decoder');
    }

    const results = data.Results;

    // Extract all relevant fields
    const decodedData: VINDecoderResult = {
      make: extractValue(results, 'Make'),
      model: extractValue(results, 'Model'),
      year: extractValue(results, 'Model Year'),
      bodyClass: extractValue(results, 'Body Class'),
      vehicleType: extractValue(results, 'Vehicle Type'),
      
      // Weight-related fields
      gvwr: extractValue(results, 'Gross Vehicle Weight Rating From'),
      gvwrRange: extractValue(results, 'GVWR'),
      
      // Color (often not available in VIN)
      color: extractValue(results, 'Color') || extractValue(results, 'Exterior Color'),
      
      // Engine specifications
      engineCylinders: extractValue(results, 'Engine Number of Cylinders'),
      engineDisplacement: extractValue(results, 'Displacement (L)'),
      engineHP: extractValue(results, 'Engine Brake (hp) From'),
      fuelType: extractValue(results, 'Fuel Type - Primary'),
      
      // Drivetrain
      transmissionStyle: extractValue(results, 'Transmission Style'),
      driveType: extractValue(results, 'Drive Type'),
      
      // Other details
      doors: extractValue(results, 'Doors'),
      manufacturer: extractValue(results, 'Manufacturer Name'),
      plantCountry: extractValue(results, 'Plant Country'),
    };

    return decodedData;
  } catch (error) {
    console.error('VIN decoding error:', error);
    throw error;
  }
}

/**
 * Get estimated weight from GVWR
 * GVWR is typically 1.3-1.5x the curb weight for passenger vehicles
 * This provides a rough estimate when exact curb weight is not available
 */
export function estimateWeightFromGVWR(gvwr: string | undefined): number | undefined {
  if (!gvwr) return undefined;
  
  const gvwrValue = parseWeight(gvwr);
  if (!gvwrValue) return undefined;
  
  // Estimate curb weight as approximately 70-75% of GVWR
  // Using 72.5% as a middle ground
  return Math.round(gvwrValue * 0.725);
}

/**
 * Parse GVWR range string (e.g., "Class 1C: 6,001 - 7,000 lb (2,722 - 3,175 kg)")
 * Returns the midpoint in pounds
 */
export function parseGVWRRange(gvwrRange: string | undefined): number | undefined {
  if (!gvwrRange) return undefined;
  
  // Extract numbers from range like "6,001 - 7,000"
  const rangeMatch = gvwrRange.match(/(\d[\d,]*)\s*-\s*(\d[\d,]*)/);
  if (!rangeMatch) return undefined;
  
  const min = parseFloat(rangeMatch[1].replace(/,/g, ''));
  const max = parseFloat(rangeMatch[2].replace(/,/g, ''));
  
  if (isNaN(min) || isNaN(max)) return undefined;
  
  // Return midpoint
  return Math.round((min + max) / 2);
}

/**
 * Get the best available weight estimate from decoded VIN data
 * Priority: Curb Weight > GVWR midpoint > Estimated from GVWR
 */
export function getBestWeightEstimate(decodedData: VINDecoderResult): number | undefined {
  // Try curb weight first (if it becomes available in future)
  if (decodedData.curbWeight) {
    const weight = parseWeight(decodedData.curbWeight);
    if (weight) return weight;
  }
  
  // Try GVWR range midpoint
  if (decodedData.gvwrRange) {
    const rangeWeight = parseGVWRRange(decodedData.gvwrRange);
    if (rangeWeight) {
      // Estimate curb weight from GVWR range midpoint
      return Math.round(rangeWeight * 0.725);
    }
  }
  
  // Try direct GVWR value
  if (decodedData.gvwr) {
    return estimateWeightFromGVWR(decodedData.gvwr);
  }
  
  return undefined;
}
