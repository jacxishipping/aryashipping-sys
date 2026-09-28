import type { IaaiLotVehicleData } from '@/lib/iaai/lot-scraper';

export async function fetchIaaiLotDataForShipment(stockNumber: string): Promise<IaaiLotVehicleData> {
  const response = await fetch(`/api/iaai/lot/${encodeURIComponent(stockNumber)}`, {
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as IaaiLotVehicleData & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to fetch IAAI lot data.');
  }

  return payload;
}

export function buildIaaiLotSummary(data: IaaiLotVehicleData) {
  const summaryParts = [
    [data.vehicleYear, data.vehicleMake, data.vehicleModel].filter(Boolean).join(' '),
    data.extracted.damage ? `Damage: ${data.extracted.damage}` : undefined,
    data.extracted.odometer ? `Odometer: ${data.extracted.odometer}` : undefined,
    data.purchaseLocation,
  ].filter(Boolean);

  return summaryParts.join(' • ');
}
