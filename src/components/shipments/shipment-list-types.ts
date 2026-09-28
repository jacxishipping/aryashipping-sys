export interface Shipment {
	id: string;
	trackingNumber?: string;
	vehicleType: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleYear?: number | null;
	vehicleVIN?: string | null;
	purchasePrice?: number | null;
	purchasePricePaid?: number | null;
	origin?: string;
	destination?: string;
	status: string;
	progress?: number;
	estimatedDelivery?: string | null;
	createdAt: string;
	paymentStatus?: string;
	dispatchId?: string | null;
	containerId?: string | null;
	transitId?: string | null;
	dispatch?: {
		id: string;
		referenceNumber: string;
		status?: string;
		origin?: string | null;
		destination?: string | null;
	} | null;
	container?: {
		id: string;
		containerNumber: string;
		trackingNumber?: string | null;
		status?: string;
		currentLocation?: string | null;
		progress?: number;
	} | null;
	transit?: {
		id: string;
		referenceNumber: string;
		status?: string;
		destination?: string | null;
	} | null;
	yardReceived?: boolean;
	yardReceivedAt?: string | null;
	user?: {
		name: string | null;
		email: string;
	};
}

export interface ShipmentTableRow {
	id: string;
	vehicle: string;
	vin: string;
	purchasePrice: number | null;
	purchasePricePaid: number | null;
	status: string;
	yardReceived: boolean;
	paymentStatus: string;
	container: string;
	createdAt: string;
	customer: string;
}