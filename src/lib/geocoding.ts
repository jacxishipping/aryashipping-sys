
// Known port coordinates
export const PORT_COORDINATES: Record<string, [number, number]> = {
  // North America - East
  'New York': [40.6848, -74.0088],
  'Newark': [40.6895, -74.1745],
  'Savannah': [32.0809, -81.0912],
  'Charleston': [32.7765, -79.9311],
  'Norfolk': [36.8508, -76.2859],
  'Baltimore': [39.2904, -76.6122],
  'Miami': [25.7617, -80.1918],
  'Jacksonville': [30.3322, -81.6557],

  // North America - West
  'Los Angeles': [33.7288, -118.2620],
  'Long Beach': [33.7701, -118.1937],
  'Oakland': [37.8044, -122.2712],
  'Seattle': [47.6062, -122.3321],
  'Tacoma': [47.2529, -122.4443],
  'Vancouver': [49.2827, -123.1207],
  'Prince Rupert': [54.3150, -130.3208],

  // North America - Gulf
  'Houston': [29.7604, -95.3698],
  'New Orleans': [29.9511, -90.0715],
  'Mobile': [30.6954, -88.0399],

  // Asia
  'Singapore': [1.2644, 103.8298],
  'Shanghai': [31.2304, 121.4737],
  'Ningbo': [29.8683, 121.5440],
  'Shenzhen': [22.5431, 114.0579],
  'Busan': [35.1796, 129.0756],
  'Qingdao': [36.0671, 120.3826],
  'Hong Kong': [22.3193, 114.1694],
  'Tokyo': [35.6762, 139.6503],
  'Yokohama': [35.4437, 139.6380],
  'Kaohsiung': [22.6273, 120.3014],
  'Port Kelang': [22.5167, 101.3833], // Approx

  // Middle East & South Asia
  'Jebel Ali': [24.9958, 55.0667],
  'Dubai': [25.2048, 55.2708],
  'Abu Dhabi': [25.276987, 55.296249],
  'Salalah': [16.9455, 54.0063],
  'Jeddah': [21.4858, 39.1925],
  'Port Qasim': [24.7827, 67.3436],
  'Karachi': [24.8415, 66.9748],
  'Mumbai': [24.9600, 67.0600], // Approx
  'Nhava Sheva': [18.9500, 72.9500],

  // Europe
  'Rotterdam': [51.9566, 4.1257],
  'Antwerp': [51.9502, 4.2570],
  'Hamburg': [53.5356, 9.9678],
  'Bremerhaven': [53.5488, 8.5833],
  'Felixstowe': [51.9614, 1.3513],
  'Southampton': [50.9097, 1.4044],
  'Le Havre': [49.4944, 0.1079],
  'Valencia': [39.4699, -0.3763],
  'Barcelona': [39.4699, -0.3763], // Fix coords
  'Algeciras': [36.1408, -5.4562],

  // Africa
  'Mombasa': [-4.0435, 39.6682],
  'Dar es Salaam': [-6.8235, 39.2695],
  'Durban': [-29.8587, 31.0218],
  'Cape Town': [-33.9249, 18.4241],
  'Tanger Med': [35.8866, -5.5133],
};

// In-memory cache for geocoding results
const geocodeCache = new Map<string, [number, number] | null>();
const MAX_CACHE_SIZE = 1000;

// Helper to get coordinates
export const getCoordinates = async (location: string): Promise<[number, number] | null> => {
  if (!location) return null;
  const cleanLoc = location.trim();

  // 1. Check known list
  const knownKey = Object.keys(PORT_COORDINATES).find(key =>
    cleanLoc.toLowerCase().includes(key.toLowerCase())
  );
  if (knownKey) return PORT_COORDINATES[knownKey];

  // 2. Check in-memory cache
  if (geocodeCache.has(cleanLoc)) {
    return geocodeCache.get(cleanLoc) || null;
  }

  // 3. Fallback to OSM
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanLoc)}&limit=1`);
    if (!res.ok) throw new Error(`OSM API Error: ${res.status}`);

    const data = await res.json();

    // Manage cache size before adding new entry
    if (geocodeCache.size >= MAX_CACHE_SIZE) {
      const firstKey = geocodeCache.keys().next().value;
      if (firstKey) geocodeCache.delete(firstKey);
    }

    if (data && data.length > 0) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache.set(cleanLoc, coords);
      return coords;
    } else {
        // Cache misses too to prevent repeated failed lookups
        geocodeCache.set(cleanLoc, null);
    }
  } catch (e) {
    console.warn(`Failed to geocode ${location}:`, e);
  }
  return null;
};
