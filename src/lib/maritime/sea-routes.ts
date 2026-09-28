/**
 * Maritime Sea Routing and AIS Navigation Engine
 * Computes realistic oceanic sea corridors, waypoints, nautical distances,
 * vessel heading (COG), and interpolated positions across global shipping lanes.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MaritimeWaypoint {
  id: string;
  name: string;
  code?: string;
  type: 'port_origin' | 'port_destination' | 'canal' | 'strait' | 'sea_lane';
  lat: number;
  lng: number;
  description?: string;
  passed?: boolean;
  active?: boolean;
  eta?: string;
}

export interface VesselAISTelemetry {
  vesselName: string;
  voyageNumber?: string;
  imoNumber: string;
  mmsi: string;
  flag: {
    country: string;
    code: string;
    emoji: string;
  };
  vesselType: string;
  lengthMeters: number;
  beamMeters: number;
  draughtMeters: number;
  currentPosition: GeoPoint;
  headingDegrees: number; // 0 to 360
  speedKnots: number;
  navigationalStatus: string;
  aisStation: string;
  lastSignalTime: string;
  weather: {
    seaState: string;
    waveHeightMeters: number;
    windSpeedKnots: number;
    windDirection: string;
    waterTempC: number;
  };
}

export interface SeaRouteAnalysis {
  originPort: string;
  destinationPort: string;
  originCoords: GeoPoint;
  destCoords: GeoPoint;
  waypoints: MaritimeWaypoint[];
  denseRouteCoordinates: [number, number][]; // [lat, lng][] for Leaflet
  totalDistanceNM: number;
  totalDistanceKM: number;
  distanceCoveredNM: number;
  distanceRemainingNM: number;
  progressPct: number;
  vesselCurrentPos: GeoPoint;
  vesselHeading: number;
  vesselSpeedKnots: number;
  etaDays: number;
  etaHours: number;
  etaDate: Date;
  activeWaypointIndex: number;
  currentZoneName: string;
}

// Global Maritime Choke-Points & Corridors
export const MARITIME_CHOKEPOINTS: Record<string, GeoPoint & { name: string; type: MaritimeWaypoint['type']; description: string }> = {
  // Transatlantic & European Corridors
  US_EAST_OFFSHORE: { name: 'US East Coast Sea Lane', type: 'sea_lane', lat: 39.5, lng: -71.5, description: 'Western Atlantic outbound traffic separation' },
  GULF_FLORIDA_STRAIT: { name: 'Florida Straits', type: 'strait', lat: 24.5, lng: -81.0, description: 'Gulf of Mexico to Atlantic sea passage' },
  NORTH_ATLANTIC_WAYPOINT: { name: 'North Atlantic Ocean Corridor', type: 'sea_lane', lat: 37.0, lng: -35.0, description: 'Deep ocean mid-Atlantic great circle lane' },
  GIBRALTAR_ENTRANCE: { name: 'Strait of Gibraltar', type: 'strait', lat: 35.95, lng: -5.60, description: 'Atlantic - Mediterranean maritime gateway' },
  
  // Mediterranean Corridor
  MED_WEST: { name: 'Alboran Sea Corridor', type: 'sea_lane', lat: 36.8, lng: -1.5, description: 'Western Mediterranean deepwater lane' },
  MED_SICILY_STRAIT: { name: 'Strait of Sicily', type: 'strait', lat: 37.0, lng: 11.5, description: 'Central Mediterranean transit strait' },
  MED_EAST_CRETEROUTE: { name: 'South Crete Corridor', type: 'sea_lane', lat: 34.2, lng: 25.0, description: 'Eastern Mediterranean shipping corridor' },
  MERSIN_APPROACH: { name: 'Gulf of Iskenderun', type: 'sea_lane', lat: 36.4, lng: 35.2, description: 'Northeastern Mediterranean port approach' },

  // Suez & Red Sea Corridor
  SUEZ_NORTH_PORT_SAID: { name: 'Port Said (Suez North)', type: 'canal', lat: 31.26, lng: 32.31, description: 'Northern entrance to the Suez Canal' },
  SUEZ_SOUTH: { name: 'Suez Port (Canal South)', type: 'canal', lat: 29.97, lng: 32.56, description: 'Southern terminus into Gulf of Suez' },
  RED_SEA_CENTRAL: { name: 'Red Sea Deepwater Route', type: 'sea_lane', lat: 21.0, lng: 38.0, description: 'Central Red Sea traffic fairway' },
  BAB_EL_MANDEB: { name: 'Bab-el-Mandeb Strait', type: 'strait', lat: 12.58, lng: 43.33, description: 'Red Sea to Gulf of Aden strategic choke-point' },
  GULF_OF_ADEN: { name: 'Gulf of Aden Transit Corridor', type: 'sea_lane', lat: 12.3, lng: 48.0, description: 'Internationally Recommended Transit Corridor (IRTC)' },

  // Arabian Sea & Persian Gulf
  ARABIAN_SEA_WEST: { name: 'Western Arabian Sea', type: 'sea_lane', lat: 17.5, lng: 56.5, description: 'Arabian Sea deepwater route' },
  GULF_OF_OMAN: { name: 'Gulf of Oman Approach', type: 'sea_lane', lat: 24.5, lng: 58.8, description: 'Omani deepwater corridor to the Gulf' },
  STRAIT_OF_HORMUZ: { name: 'Strait of Hormuz', type: 'strait', lat: 26.56, lng: 56.25, description: 'Primary gateway to Arabian / Persian Gulf' },
  ARABIAN_GULF_SOUTH: { name: 'Southern Gulf Sea Lane', type: 'sea_lane', lat: 25.4, lng: 54.8, description: 'Approach to UAE deepwater container terminals' },

  // Alternate South Africa Route (Cape of Good Hope)
  CAPE_VERDE_OFFSHORE: { name: 'Cape Verde Sea Lane', type: 'sea_lane', lat: 15.0, lng: -24.0, description: 'Atlantic equatorial route' },
  CAPE_OF_GOOD_HOPE: { name: 'Cape of Good Hope', type: 'strait', lat: -34.8, lng: 19.5, description: 'Southern Africa oceanic cape route' },
  MOZAMBIQUE_CHANNEL: { name: 'Mozambique Channel', type: 'sea_lane', lat: -18.0, lng: 41.0, description: 'Indian Ocean northbound corridor' },
  
  // Asia Corridors
  MALACCA_STRAIT: { name: 'Strait of Malacca (Singapore)', type: 'strait', lat: 1.25, lng: 103.80, description: 'Major East Asia shipping artery' },
};

// Known Port Geo-Registry with Standard UN/LOCODEs
export const PORT_GEO_REGISTRY: Record<string, GeoPoint & { name: string; locode: string; country: string }> = {
  // USA
  'newark': { name: 'Port of New York & New Jersey', locode: 'USNWK', country: 'United States', lat: 40.6895, lng: -74.1745 },
  'new york': { name: 'Port of New York', locode: 'USNYC', country: 'United States', lat: 40.6848, lng: -74.0088 },
  'savannah': { name: 'Port of Savannah', locode: 'USSAV', country: 'United States', lat: 32.0809, lng: -81.0912 },
  'norfolk': { name: 'Port of Virginia (Norfolk)', locode: 'USORF', country: 'United States', lat: 36.8508, lng: -76.2859 },
  'baltimore': { name: 'Port of Baltimore', locode: 'USBAL', country: 'United States', lat: 39.2904, lng: -76.6122 },
  'charleston': { name: 'Port of Charleston', locode: 'USCHS', country: 'United States', lat: 32.7765, lng: -79.9311 },
  'houston': { name: 'Port of Houston', locode: 'USHOU', country: 'United States', lat: 29.7604, lng: -95.3698 },
  'los angeles': { name: 'Port of Los Angeles', locode: 'USLAX', country: 'United States', lat: 33.7288, lng: -118.2620 },
  'long beach': { name: 'Port of Long Beach', locode: 'USLGB', country: 'United States', lat: 33.7701, lng: -118.1937 },

  // UAE & Gulf
  'jebel ali': { name: 'Port of Jebel Ali', locode: 'AEJEA', country: 'United Arab Emirates', lat: 24.9958, lng: 55.0667 },
  'dubai': { name: 'Port Rashid (Dubai)', locode: 'AEDXB', country: 'United Arab Emirates', lat: 25.2667, lng: 55.2833 },
  'abu dhabi': { name: 'Khalifa Port (Abu Dhabi)', locode: 'AEKHL', country: 'United Arab Emirates', lat: 24.7891, lng: 54.6789 },
  'sharjah': { name: 'Port Khalid (Sharjah)', locode: 'AESHJ', country: 'United Arab Emirates', lat: 25.3589, lng: 55.3789 },
  'khorfakkan': { name: 'Khor Fakkan Container Terminal', locode: 'AEKLF', country: 'United Arab Emirates', lat: 25.3600, lng: 56.3600 },
  'dammam': { name: 'King Abdul Aziz Port (Dammam)', locode: 'SADMN', country: 'Saudi Arabia', lat: 26.4333, lng: 50.1167 },
  'salalah': { name: 'Port of Salalah', locode: 'OMSLL', country: 'Oman', lat: 16.9455, lng: 54.0063 },
  'sohar': { name: 'Port of Sohar', locode: 'OMSOH', country: 'Oman', lat: 24.4986, lng: 56.6267 },

  // Turkey & Mediterranean
  'mersin': { name: 'Mersin International Port', locode: 'TRMER', country: 'Turkey', lat: 36.7950, lng: 34.6400 },
  'istanbul': { name: 'Port of Ambarli (Istanbul)', locode: 'TRIST', country: 'Turkey', lat: 40.9700, lng: 28.6900 },
  'izmir': { name: 'Port of Izmir (Alsancak)', locode: 'TRIZM', country: 'Turkey', lat: 38.4389, lng: 27.1422 },
  'piraeus': { name: 'Port of Piraeus', locode: 'GRPIR', country: 'Greece', lat: 37.9422, lng: 23.6367 },
  'valencia': { name: 'Port of Valencia', locode: 'ESVLC', country: 'Spain', lat: 39.4442, lng: -0.3242 },
  'algeciras': { name: 'Port of Algeciras', locode: 'ESALG', country: 'Spain', lat: 36.1408, lng: -5.4562 },
  'rotterdam': { name: 'Port of Rotterdam', locode: 'NLRTM', country: 'Netherlands', lat: 51.9566, lng: 4.1257 },
  'antwerp': { name: 'Port of Antwerp', locode: 'BEANR', country: 'Belgium', lat: 51.9502, lng: 4.2570 },

  // South Asia
  'karachi': { name: 'Karachi Port', locode: 'PKKHI', country: 'Pakistan', lat: 24.8415, lng: 66.9748 },
  'port qasim': { name: 'Port Muhammad Bin Qasim', locode: 'PKBQM', country: 'Pakistan', lat: 24.7827, lng: 67.3436 },
  'nhava sheva': { name: 'Jawaharlal Nehru Port (Nhava Sheva)', locode: 'INNSA', country: 'India', lat: 18.9500, lng: 72.9500 },
  'mundra': { name: 'Port of Mundra', locode: 'INMUN', country: 'India', lat: 22.7500, lng: 69.7000 },
};

/**
 * Resolve port coordinates from raw string input.
 */
export function resolvePortLocation(portQuery?: string | null): { name: string; locode: string; lat: number; lng: number } {
  if (!portQuery) {
    return { name: 'Port of Newark (USNWK)', locode: 'USNWK', lat: 40.6895, lng: -74.1745 };
  }

  const query = portQuery.toLowerCase().trim();
  for (const [key, data] of Object.entries(PORT_GEO_REGISTRY)) {
    if (query.includes(key) || data.locode.toLowerCase() === query) {
      return { name: data.name, locode: data.locode, lat: data.lat, lng: data.lng };
    }
  }

  // Fallback default
  if (query.includes('jebel') || query.includes('dubai') || query.includes('uae')) {
    const p = PORT_GEO_REGISTRY['jebel ali'];
    return { name: p.name, locode: p.locode, lat: p.lat, lng: p.lng };
  }

  return { name: portQuery, locode: 'PORT', lat: 40.6895, lng: -74.1745 };
}

/**
 * Haversine formula to compute great circle distance in Nautical Miles.
 */
export function haversineDistanceNM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R_NM = 3440.065; // Earth radius in nautical miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R_NM * c);
}

/**
 * Compute Initial Compass Bearing / Course Over Ground (0° to 360°).
 */
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return Math.round((toDeg(θ) + 360) % 360);
}

/**
 * Great circle intermediate point interpolation.
 */
function interpolateIntermediatePoint(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fraction: number
): [number, number] {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const d = 2 * Math.asin(Math.min(1, Math.sqrt(
    Math.sin((φ1 - φ2) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ1 - λ2) / 2) ** 2
  )));

  if (Math.abs(d) < 1e-9) return [lat1, lon1];

  const A = Math.sin((1 - fraction) * d) / Math.sin(d);
  const B = Math.sin(fraction * d) / Math.sin(d);

  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);

  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);

  return [toDeg(φi), toDeg(λi)];
}

/**
 * Generate high-resolution maritime sea route through canonical choke points.
 */
export function buildMaritimeRoute(
  originQuery: string,
  destinationQuery: string,
  progressPct = 65,
  departureDate?: Date | null,
  estimatedArrival?: Date | null
): SeaRouteAnalysis {
  const origin = resolvePortLocation(originQuery);
  const destination = resolvePortLocation(destinationQuery);

  // Assemble the sequential choke points for standard Transatlantic -> Med -> Suez -> Gulf corridor
  const isFromGulfOrEastUS = origin.lng < -60;
  const isToMersin = destination.name.toLowerCase().includes('mersin') || destinationQuery.toLowerCase().includes('mersin');
  const isToGulfOrUAE = destination.lng > 45 && destination.lat > 15;

  const corridorWaypoints: MaritimeWaypoint[] = [];

  // 1. Origin
  corridorWaypoints.push({
    id: 'wp-origin',
    name: origin.name,
    code: origin.locode,
    type: 'port_origin',
    lat: origin.lat,
    lng: origin.lng,
    description: `Departure port: ${origin.name}`,
  });

  // 2. Outbound Sea Lane
  if (isFromGulfOrEastUS) {
    if (origin.lat < 30) {
      corridorWaypoints.push({
        id: 'wp-florida-strait',
        name: MARITIME_CHOKEPOINTS.GULF_FLORIDA_STRAIT.name,
        type: 'strait',
        lat: MARITIME_CHOKEPOINTS.GULF_FLORIDA_STRAIT.lat,
        lng: MARITIME_CHOKEPOINTS.GULF_FLORIDA_STRAIT.lng,
        description: MARITIME_CHOKEPOINTS.GULF_FLORIDA_STRAIT.description,
      });
    } else {
      corridorWaypoints.push({
        id: 'wp-us-offshore',
        name: MARITIME_CHOKEPOINTS.US_EAST_OFFSHORE.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.US_EAST_OFFSHORE.lat,
        lng: MARITIME_CHOKEPOINTS.US_EAST_OFFSHORE.lng,
        description: MARITIME_CHOKEPOINTS.US_EAST_OFFSHORE.description,
      });
    }

    // Mid-Atlantic
    corridorWaypoints.push({
      id: 'wp-atlantic',
      name: MARITIME_CHOKEPOINTS.NORTH_ATLANTIC_WAYPOINT.name,
      type: 'sea_lane',
      lat: MARITIME_CHOKEPOINTS.NORTH_ATLANTIC_WAYPOINT.lat,
      lng: MARITIME_CHOKEPOINTS.NORTH_ATLANTIC_WAYPOINT.lng,
      description: MARITIME_CHOKEPOINTS.NORTH_ATLANTIC_WAYPOINT.description,
    });
  }

  // 3. Strait of Gibraltar (Key gateway for Europe/Middle East)
  corridorWaypoints.push({
    id: 'wp-gibraltar',
    name: MARITIME_CHOKEPOINTS.GIBRALTAR_ENTRANCE.name,
    type: 'strait',
    lat: MARITIME_CHOKEPOINTS.GIBRALTAR_ENTRANCE.lat,
    lng: MARITIME_CHOKEPOINTS.GIBRALTAR_ENTRANCE.lng,
    description: MARITIME_CHOKEPOINTS.GIBRALTAR_ENTRANCE.description,
  });

  // 4. Mediterranean Sea
  corridorWaypoints.push({
    id: 'wp-med-west',
    name: MARITIME_CHOKEPOINTS.MED_WEST.name,
    type: 'sea_lane',
    lat: MARITIME_CHOKEPOINTS.MED_WEST.lat,
    lng: MARITIME_CHOKEPOINTS.MED_WEST.lng,
    description: MARITIME_CHOKEPOINTS.MED_WEST.description,
  });

  corridorWaypoints.push({
    id: 'wp-med-sicily',
    name: MARITIME_CHOKEPOINTS.MED_SICILY_STRAIT.name,
    type: 'strait',
    lat: MARITIME_CHOKEPOINTS.MED_SICILY_STRAIT.lat,
    lng: MARITIME_CHOKEPOINTS.MED_SICILY_STRAIT.lng,
    description: MARITIME_CHOKEPOINTS.MED_SICILY_STRAIT.description,
  });

  if (isToMersin) {
    // Route direct to Mersin / Eastern Turkey
    corridorWaypoints.push({
      id: 'wp-mersin-gulf',
      name: MARITIME_CHOKEPOINTS.MERSIN_APPROACH.name,
      type: 'sea_lane',
      lat: MARITIME_CHOKEPOINTS.MERSIN_APPROACH.lat,
      lng: MARITIME_CHOKEPOINTS.MERSIN_APPROACH.lng,
      description: MARITIME_CHOKEPOINTS.MERSIN_APPROACH.description,
    });
  } else {
    // Eastern Med -> Suez
    corridorWaypoints.push({
      id: 'wp-med-east',
      name: MARITIME_CHOKEPOINTS.MED_EAST_CRETEROUTE.name,
      type: 'sea_lane',
      lat: MARITIME_CHOKEPOINTS.MED_EAST_CRETEROUTE.lat,
      lng: MARITIME_CHOKEPOINTS.MED_EAST_CRETEROUTE.lng,
      description: MARITIME_CHOKEPOINTS.MED_EAST_CRETEROUTE.description,
    });

    corridorWaypoints.push({
      id: 'wp-suez-north',
      name: MARITIME_CHOKEPOINTS.SUEZ_NORTH_PORT_SAID.name,
      type: 'canal',
      lat: MARITIME_CHOKEPOINTS.SUEZ_NORTH_PORT_SAID.lat,
      lng: MARITIME_CHOKEPOINTS.SUEZ_NORTH_PORT_SAID.lng,
      description: MARITIME_CHOKEPOINTS.SUEZ_NORTH_PORT_SAID.description,
    });

    corridorWaypoints.push({
      id: 'wp-suez-south',
      name: MARITIME_CHOKEPOINTS.SUEZ_SOUTH.name,
      type: 'canal',
      lat: MARITIME_CHOKEPOINTS.SUEZ_SOUTH.lat,
      lng: MARITIME_CHOKEPOINTS.SUEZ_SOUTH.lng,
      description: MARITIME_CHOKEPOINTS.SUEZ_SOUTH.description,
    });

    corridorWaypoints.push({
      id: 'wp-red-sea',
      name: MARITIME_CHOKEPOINTS.RED_SEA_CENTRAL.name,
      type: 'sea_lane',
      lat: MARITIME_CHOKEPOINTS.RED_SEA_CENTRAL.lat,
      lng: MARITIME_CHOKEPOINTS.RED_SEA_CENTRAL.lng,
      description: MARITIME_CHOKEPOINTS.RED_SEA_CENTRAL.description,
    });

    corridorWaypoints.push({
      id: 'wp-bab-el-mandeb',
      name: MARITIME_CHOKEPOINTS.BAB_EL_MANDEB.name,
      type: 'strait',
      lat: MARITIME_CHOKEPOINTS.BAB_EL_MANDEB.lat,
      lng: MARITIME_CHOKEPOINTS.BAB_EL_MANDEB.lng,
      description: MARITIME_CHOKEPOINTS.BAB_EL_MANDEB.description,
    });

    corridorWaypoints.push({
      id: 'wp-gulf-aden',
      name: MARITIME_CHOKEPOINTS.GULF_OF_ADEN.name,
      type: 'sea_lane',
      lat: MARITIME_CHOKEPOINTS.GULF_OF_ADEN.lat,
      lng: MARITIME_CHOKEPOINTS.GULF_OF_ADEN.lng,
      description: MARITIME_CHOKEPOINTS.GULF_OF_ADEN.description,
    });

    if (isToGulfOrUAE) {
      corridorWaypoints.push({
        id: 'wp-arabian-sea',
        name: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.lat,
        lng: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.lng,
        description: MARITIME_CHOKEPOINTS.ARABIAN_SEA_WEST.description,
      });

      corridorWaypoints.push({
        id: 'wp-gulf-oman',
        name: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.lat,
        lng: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.lng,
        description: MARITIME_CHOKEPOINTS.GULF_OF_OMAN.description,
      });

      corridorWaypoints.push({
        id: 'wp-hormuz',
        name: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.name,
        type: 'strait',
        lat: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.lat,
        lng: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.lng,
        description: MARITIME_CHOKEPOINTS.STRAIT_OF_HORMUZ.description,
      });

      corridorWaypoints.push({
        id: 'wp-gulf-south',
        name: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.name,
        type: 'sea_lane',
        lat: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.lat,
        lng: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.lng,
        description: MARITIME_CHOKEPOINTS.ARABIAN_GULF_SOUTH.description,
      });
    }
  }

  // Final destination port
  corridorWaypoints.push({
    id: 'wp-destination',
    name: destination.name,
    code: destination.locode,
    type: 'port_destination',
    lat: destination.lat,
    lng: destination.lng,
    description: `Destination port: ${destination.name}`,
  });

  // Generate dense coordinates along the sea lane (smoothing between nodes)
  const denseRouteCoordinates: [number, number][] = [];
  let totalDistanceNM = 0;
  const segmentDistances: number[] = [];

  for (let i = 0; i < corridorWaypoints.length - 1; i++) {
    const p1 = corridorWaypoints[i];
    const p2 = corridorWaypoints[i + 1];
    const segDist = haversineDistanceNM(p1.lat, p1.lng, p2.lat, p2.lng);
    segmentDistances.push(segDist);
    totalDistanceNM += segDist;

    // Subdivide each segment into 12-25 points for smooth marine curve
    const steps = Math.max(8, Math.min(30, Math.floor(segDist / 120)));
    for (let s = 0; s <= steps; s++) {
      if (s === steps && i < corridorWaypoints.length - 2) continue; // avoid duplicating vertex
      const subFraction = s / steps;
      const interp = interpolateIntermediatePoint(p1.lat, p1.lng, p2.lat, p2.lng, subFraction);
      denseRouteCoordinates.push(interp);
    }
  }

  // Calculate vessel progress position
  const safeProgress = Math.min(100, Math.max(0, progressPct));
  const targetDistance = (safeProgress / 100) * totalDistanceNM;

  let accumulatedDist = 0;
  let activeWaypointIndex = 0;
  let vesselCurrentPos: GeoPoint = { lat: corridorWaypoints[0].lat, lng: corridorWaypoints[0].lng };
  let vesselHeading = 90;

  for (let i = 0; i < segmentDistances.length; i++) {
    const segDist = segmentDistances[i];
    if (accumulatedDist + segDist >= targetDistance || i === segmentDistances.length - 1) {
      activeWaypointIndex = i;
      const segmentFraction = segDist > 0 ? (targetDistance - accumulatedDist) / segDist : 0;
      const safeFraction = Math.min(1, Math.max(0, segmentFraction));
      const p1 = corridorWaypoints[i];
      const p2 = corridorWaypoints[i + 1];

      const [interpLat, interpLng] = interpolateIntermediatePoint(p1.lat, p1.lng, p2.lat, p2.lng, safeFraction);
      vesselCurrentPos = { lat: interpLat, lng: interpLng };
      vesselHeading = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng);
      break;
    }
    accumulatedDist += segDist;
  }

  // Mark waypoints as passed / active
  for (let i = 0; i < corridorWaypoints.length; i++) {
    if (i < activeWaypointIndex) {
      corridorWaypoints[i].passed = true;
      corridorWaypoints[i].active = false;
    } else if (i === activeWaypointIndex) {
      corridorWaypoints[i].passed = false;
      corridorWaypoints[i].active = true;
    } else {
      corridorWaypoints[i].passed = false;
      corridorWaypoints[i].active = false;
    }
  }

  const distanceCoveredNM = Math.round(targetDistance);
  const distanceRemainingNM = Math.max(0, totalDistanceNM - distanceCoveredNM);
  const totalDistanceKM = Math.round(totalDistanceNM * 1.852);

  // Speed and ETA calculations
  const vesselSpeedKnots = safeProgress >= 100 ? 0 : 18.5; // Average container ship cruising speed
  const hoursRemaining = vesselSpeedKnots > 0 ? distanceRemainingNM / vesselSpeedKnots : 0;
  const etaDays = Math.floor(hoursRemaining / 24);
  const etaHours = Math.round(hoursRemaining % 24);

  const etaDate = estimatedArrival 
    ? new Date(estimatedArrival) 
    : new Date(Date.now() + hoursRemaining * 3600 * 1000);

  const currentZone = corridorWaypoints[activeWaypointIndex]?.name || 'High Seas';

  return {
    originPort: origin.name,
    destinationPort: destination.name,
    originCoords: { lat: origin.lat, lng: origin.lng },
    destCoords: { lat: destination.lat, lng: destination.lng },
    waypoints: corridorWaypoints,
    denseRouteCoordinates,
    totalDistanceNM,
    totalDistanceKM,
    distanceCoveredNM,
    distanceRemainingNM,
    progressPct: safeProgress,
    vesselCurrentPos,
    vesselHeading,
    vesselSpeedKnots,
    etaDays,
    etaHours,
    etaDate,
    activeWaypointIndex,
    currentZoneName: currentZone,
  };
}

/**
 * Generate simulated AIS telematics for a container vessel.
 */
export function generateVesselAISTelemetry(
  vesselName = 'MAERSK MC-KINNEY MOLLER',
  voyageNumber = 'V-2409W',
  routeAnalysis: SeaRouteAnalysis
): VesselAISTelemetry {
  const isComplete = routeAnalysis.progressPct >= 100;
  const isStarted = routeAnalysis.progressPct > 0;

  // Realistic IMO & MMSI generation based on vessel name
  const nameHash = vesselName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const imoNumber = `IMO 9${(nameHash * 13) % 900000 + 100000}`;
  const mmsi = `219${(nameHash * 73) % 900000 + 100000}`;

  // Sea State based on ocean region
  const zone = routeAnalysis.currentZoneName.toLowerCase();
  let seaState = 'Moderate (1.2m - 1.8m swell)';
  let waveHeightMeters = 1.4;
  let windKnots = 16;
  let windDir = 'ENE';
  let waterTemp = 24;

  if (zone.includes('atlantic')) {
    seaState = 'Moderate to Rough (2.1m swell)';
    waveHeightMeters = 2.1;
    windKnots = 22;
    windDir = 'WNW';
    waterTemp = 19;
  } else if (zone.includes('red sea') || zone.includes('suez')) {
    seaState = 'Smooth to Slight (0.6m chop)';
    waveHeightMeters = 0.6;
    windKnots = 11;
    windDir = 'NNW';
    waterTemp = 28;
  } else if (zone.includes('gulf') || zone.includes('hormuz')) {
    seaState = 'Calm (0.4m sea)';
    waveHeightMeters = 0.4;
    windKnots = 8;
    windDir = 'SE';
    waterTemp = 30;
  }

  return {
    vesselName,
    voyageNumber,
    imoNumber,
    mmsi,
    flag: {
      country: 'Denmark',
      code: 'DK',
      emoji: '🇩🇰',
    },
    vesselType: 'Fully Cellular Container Ship (ULCS)',
    lengthMeters: 399,
    beamMeters: 59,
    draughtMeters: 14.8,
    currentPosition: routeAnalysis.vesselCurrentPos,
    headingDegrees: routeAnalysis.vesselHeading,
    speedKnots: isComplete ? 0 : isStarted ? routeAnalysis.vesselSpeedKnots : 0,
    navigationalStatus: isComplete ? 'Moored / Berth' : isStarted ? 'Underway using Engine' : 'At Anchor / Loading',
    aisStation: 'Satellite AIS (Orbcomm Maritime Constellation)',
    lastSignalTime: '2 mins ago (Live AIS)',
    weather: {
      seaState,
      waveHeightMeters,
      windSpeedKnots: windKnots,
      windDirection: windDir,
      waterTempC: waterTemp,
    },
  };
}
