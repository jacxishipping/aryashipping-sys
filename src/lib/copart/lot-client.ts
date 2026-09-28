import type { CopartLotVehicleData } from '@/lib/copart/lot-scraper';

export async function fetchCopartLotDataForShipment(lotNumber: string): Promise<CopartLotVehicleData> {
  const response = await fetch(`/api/copart/lot/${encodeURIComponent(lotNumber)}`, {
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as CopartLotVehicleData & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to fetch Copart lot data.');
  }

  return payload;
}

export function buildCopartLotSummary(data: CopartLotVehicleData) {
  const summaryParts = [
    [data.vehicleYear, data.vehicleMake, data.vehicleModel].filter(Boolean).join(' '),
    data.extracted.damage ? `Damage: ${data.extracted.damage}` : undefined,
    data.purchaseLocation,
    data.vehicleVIN?.includes('*') ? 'VIN is masked on the public Copart page' : undefined,
  ].filter(Boolean);

  return summaryParts.join(' • ');
}