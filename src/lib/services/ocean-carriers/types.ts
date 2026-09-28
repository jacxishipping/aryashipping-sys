/**
 * Ocean Carrier Types and DCSA (Digital Container Shipping Association) Standard Definitions
 */

export type OceanCarrierCode = 
  | 'MAERSK'
  | 'MSC'
  | 'CMA_CGM'
  | 'HAPAG_LLOYD'
  | 'COSCO'
  | 'ONE'
  | 'EVERGREEN'
  | 'YANG_MING'
  | 'ZIM'
  | 'GENERIC_DCSA';

export interface CarrierMetadata {
  code: OceanCarrierCode;
  name: string;
  scac: string; // Standard Carrier Alpha Code
  prefixes: string[]; // ISO 6346 Container Prefixes
  logo?: string;
  accentColor: string;
  trackingBaseUrl: string;
  apiType: 'DCSA_REST' | 'CARRIER_DIRECT' | 'EDI_214';
}

export interface NormalizedCarrierEvent {
  eventId: string;
  carrierCode: OceanCarrierCode;
  eventType: 'EQUIPMENT' | 'TRANSPORT' | 'SHIPMENT' | 'CUSTOMS';
  eventClassifierCode: 'ACT' | 'EST' | 'REQ'; // Actual, Estimated, Requested
  eventDateTime: string;
  eventDescription: string;
  transportEventTypeCode?: 'DEPA' | 'ARRI' | 'LOAD' | 'DISC' | 'BERTH';
  equipmentEventTypeCode?: 'LOAD' | 'DISC' | 'GTIN' | 'GTOT' | 'STOW' | 'UNST';
  locationName: string;
  unLocationCode?: string;
  vesselName?: string;
  vesselImoNumber?: string;
  voyageNumber?: string;
  completed: boolean;
}

export interface OceanCarrierSyncSnapshot {
  containerNumber: string;
  carrier: CarrierMetadata;
  bookingNumber?: string;
  vesselName?: string;
  vesselImo?: string;
  voyageNumber?: string;
  loadingPort?: string;
  destinationPort?: string;
  transshipmentPorts: string[];
  departureDate?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  lifecycleStatus: 'CREATED' | 'WAITING_FOR_LOADING' | 'LOADED' | 'IN_TRANSIT' | 'ARRIVED_PORT' | 'CUSTOMS_CLEARANCE' | 'RELEASED' | 'CLOSED';
  progressPct: number;
  currentLocation?: string;
  events: NormalizedCarrierEvent[];
  lastSyncedAt: string;
  source: 'CARRIER_API' | 'DCSA_SYNC' | 'FALLBACK_AIS';
}

export const SUPPORTED_OCEAN_CARRIERS: Record<OceanCarrierCode, CarrierMetadata> = {
  MAERSK: {
    code: 'MAERSK',
    name: 'Maersk Line / A.P. Moller',
    scac: 'MAEU',
    prefixes: ['MSKU', 'MAEU', 'MRKU', 'MSFU', 'MRSU', 'MNBU'],
    accentColor: '#42B0D5',
    trackingBaseUrl: 'https://www.maersk.com/tracking/',
    apiType: 'DCSA_REST',
  },
  MSC: {
    code: 'MSC',
    name: 'Mediterranean Shipping Company (MSC)',
    scac: 'MSCU',
    prefixes: ['MSCU', 'MEDU', 'TTNU', 'TGHU'],
    accentColor: '#FFCC00',
    trackingBaseUrl: 'https://www.msc.com/en/track-a-shipment',
    apiType: 'DCSA_REST',
  },
  CMA_CGM: {
    code: 'CMA_CGM',
    name: 'CMA CGM Group',
    scac: 'CMDU',
    prefixes: ['CMAU', 'CGMU', 'ANLU', 'APZU'],
    accentColor: '#E60028',
    trackingBaseUrl: 'https://www.cma-cgm.com/ebusiness/tracking',
    apiType: 'DCSA_REST',
  },
  HAPAG_LLOYD: {
    code: 'HAPAG_LLOYD',
    name: 'Hapag-Lloyd',
    scac: 'HLCU',
    prefixes: ['HLCU', 'HLXU', 'UASC', 'CSQU'],
    accentColor: '#FF6600',
    trackingBaseUrl: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html',
    apiType: 'DCSA_REST',
  },
  COSCO: {
    code: 'COSCO',
    name: 'COSCO Shipping Lines',
    scac: 'COSU',
    prefixes: ['COSU', 'CSLU', 'CCLU', 'CBHU'],
    accentColor: '#003399',
    trackingBaseUrl: 'https://lines.coscoshipping.com/home/services/tracking',
    apiType: 'DCSA_REST',
  },
  ONE: {
    code: 'ONE',
    name: 'Ocean Network Express (ONE)',
    scac: 'ONEY',
    prefixes: ['ONEY', 'NYKU', 'MOLU', 'KKLU'],
    accentColor: '#E31B6D',
    trackingBaseUrl: 'https://ecomm.one-line.com/ecom/cup/cu/track-and-trace.do',
    apiType: 'DCSA_REST',
  },
  EVERGREEN: {
    code: 'EVERGREEN',
    name: 'Evergreen Marine',
    scac: 'EGLV',
    prefixes: ['EGLV', 'EISU', 'EMCU', 'UGMU'],
    accentColor: '#008037',
    trackingBaseUrl: 'https://ct.shipmentlink.com/servlet/TTr1_action',
    apiType: 'CARRIER_DIRECT',
  },
  YANG_MING: {
    code: 'YANG_MING',
    name: 'Yang Ming Marine Transport',
    scac: 'YMLU',
    prefixes: ['YMLU', 'YMMU'],
    accentColor: '#002E6E',
    trackingBaseUrl: 'https://www.yangming.com/e-service/track_trace/track_trace_cargo_tracking.aspx',
    apiType: 'CARRIER_DIRECT',
  },
  ZIM: {
    code: 'ZIM',
    name: 'ZIM Integrated Shipping',
    scac: 'ZIMU',
    prefixes: ['ZIMU', 'ZCSU'],
    accentColor: '#D38827',
    trackingBaseUrl: 'https://www.zim.com/tools/track-a-shipment',
    apiType: 'CARRIER_DIRECT',
  },
  GENERIC_DCSA: {
    code: 'GENERIC_DCSA',
    name: 'Universal DCSA Ocean Carrier',
    scac: 'DCSA',
    prefixes: [],
    accentColor: '#06B6D4',
    trackingBaseUrl: 'https://dcsa.org',
    apiType: 'DCSA_REST',
  },
};
