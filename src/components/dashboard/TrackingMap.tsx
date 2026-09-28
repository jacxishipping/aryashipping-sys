'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Box, Paper, Typography } from '@mui/material';
import { MapPin, Navigation, Ship, Anchor } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { getCoordinates } from '@/lib/geocoding';

// Dynamic import for Leaflet components
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// --- Geodesic Math Helpers ---

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

// Calculate intermediate point on a Great Circle path
function getIntermediatePoint(
  lat1: number, lon1: number, 
  lat2: number, lon2: number, 
  f: number
): [number, number] {
  const φ1 = toRad(lat1);
  const λ1 = toRad(lon1);
  const φ2 = toRad(lat2);
  const λ2 = toRad(lon2);

  const d = 2 * Math.asin(Math.min(1, Math.sqrt(Math.pow(Math.sin((φ1 - φ2) / 2), 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.pow(Math.sin((λ1 - λ2) / 2), 2))));
  
  if (Math.abs(d) < 1e-9) return [toDeg(φ1), toDeg(λ1)]; // Points are too close

  const A = Math.sin((1 - f) * d) / Math.sin(d);
  const B = Math.sin(f * d) / Math.sin(d);
  
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  
  const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
  const λi = Math.atan2(y, x);
  
  const lat = toDeg(φi);
  const lon = toDeg(λi);

  if (isNaN(lat) || isNaN(lon)) return [toDeg(φ1), toDeg(λ1)]; // Fallback

  return [lat, lon];
}

// Generate an array of points for a curved path
function getCurvedPath(start: [number, number], end: [number, number], numPoints = 100): [number, number][] {
  // Return straight line if points are identical or invalid
  if (!start || !end || (start[0] === end[0] && start[1] === end[1])) return [];
  
  const points: [number, number][] = [];
  try {
    for (let i = 0; i <= numPoints; i++) {
        points.push(getIntermediatePoint(start[0], start[1], end[0], end[1], i / numPoints));
    }
  } catch (e) {
    console.error("Error generating curved path", e);
    return [start, end];
  }
  return points;
}

interface TrackingMapProps {
  origin?: string | null;
  destination?: string | null;
  currentLocation?: string | null;
  currentCoordinates?: { lat: number; lng: number } | null;
  className?: string;
}

export function TrackingMap({ origin, destination, currentLocation, currentCoordinates, className }: TrackingMapProps) {
  const [coords, setCoords] = useState<{
    origin: [number, number] | null;
    destination: [number, number] | null;
    current: [number, number] | null;
  }>({ origin: null, destination: null, current: null });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadCoords = async () => {
      setLoading(true);
      // Initialize fresh to avoid stale state issues
      const newCoords: typeof coords = { origin: null, destination: null, current: null };

      // Determine unique locations to fetch to avoid duplicate requests
      const locationsToFetch = new Set<string>();
      if (origin) locationsToFetch.add(origin);
      if (destination) locationsToFetch.add(destination);
      
      const useExplicitCurrent = currentCoordinates && !isNaN(currentCoordinates.lat) && !isNaN(currentCoordinates.lng);

      // Only fetch currentLocation if we aren't using explicit coordinates
      if (!useExplicitCurrent && currentLocation) {
        locationsToFetch.add(currentLocation);
      }

      // Execute fetches in parallel
      const results = new Map<string, [number, number] | null>();
      const promises = Array.from(locationsToFetch).map(async (loc) => {
        const res = await getCoordinates(loc);
        if (isMounted) {
            results.set(loc, res);
        }
      });

      await Promise.all(promises);

      if (!isMounted) return;

      // Assign results
      if (origin) newCoords.origin = results.get(origin) || null;
      if (destination) newCoords.destination = results.get(destination) || null;

      // Prioritize explicit currentCoordinates
      if (useExplicitCurrent) {
        newCoords.current = [currentCoordinates!.lat, currentCoordinates!.lng];
      } else if (currentLocation) {
        newCoords.current = results.get(currentLocation) || null;
      }

      setCoords(newCoords);
      setLoading(false);
    };

    if (origin || destination || currentCoordinates) {
      loadCoords();
    } else {
      setLoading(false);
    }
    
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, currentLocation, currentCoordinates]);

  // Create custom icons
  const createIcon = (icon: ReactNode, color: string, size: number = 24) => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');
    
    const svgString = renderToStaticMarkup(
      <div style={{ 
        color: color, 
        background: 'white', 
        borderRadius: '50%', 
        padding: '4px', 
        boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size + 8,
        height: size + 8
      }}>
        {icon}
      </div>
    );

    return L.divIcon({
      html: svgString,
      className: 'custom-map-icon',
      iconSize: [size + 8, size + 8],
      iconAnchor: [(size + 8) / 2, size + 8 + 5], // Bottom center anchor
      popupAnchor: [0, -(size + 8 + 5)]
    });
  };

  const originIcon = useMemo(() => createIcon(<Anchor size={18} />, '#64748b'), [createIcon]);
  const destinationIcon = useMemo(() => createIcon(<MapPin size={18} />, '#ef4444'), [createIcon]);
  const shipIcon = useMemo(() => createIcon(<Ship size={20} />, '#c99b2f', 28), [createIcon]);

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <Typography color="textSecondary">Loading Map...</Typography>
      </Paper>
    );
  }

  if (!coords.origin && !coords.destination && !coords.current) {
    return (
      <Paper variant="outlined" sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <Box sx={{ textAlign: 'center', p: 2 }}>
            <Navigation className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <Typography color="textSecondary" sx={{ fontWeight: 500 }}>Location data not available</Typography>
            <Box sx={{ mt: 2, p: 1, bgcolor: '#f1f5f9', borderRadius: 1, fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace', textAlign: 'left' }}>
               <div style={{ marginBottom: 4 }}><strong>Debug Info:</strong></div>
               <div>Origin: {origin || 'N/A'} {coords.origin ? '✅' : '❌'}</div>
               <div>Dest: {destination || 'N/A'} {coords.destination ? '✅' : '❌'}</div>
               <div>Curr Loc: {currentLocation || 'N/A'}</div>
               <div>Curr Coords: {currentCoordinates ? `${currentCoordinates.lat.toFixed(2)}, ${currentCoordinates.lng.toFixed(2)}` : 'N/A'} {coords.current ? '✅' : '❌'}</div>
            </Box>
        </Box>
      </Paper>
    );
  }

  const center: [number, number] = coords.current || coords.origin || coords.destination || [20, 0];

  // Calculate Geodesic (Curved) Paths
  const pathPositions: [number, number][] = [];
  
  if (coords.origin && coords.current) {
      pathPositions.push(...getCurvedPath(coords.origin, coords.current));
  }
  
  if (coords.current && coords.destination) {
      pathPositions.push(...getCurvedPath(coords.current, coords.destination));
  } else if (coords.origin && coords.destination && !coords.current) {
      pathPositions.push(...getCurvedPath(coords.origin, coords.destination));
  }

  return (
    <Box sx={{ height: 400, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }} className={className}>
      <MapContainer center={center} zoom={3} style={{ height: '100%', width: '100%' }}>
        {/* CartoDB Voyager Tiles - Cleaner, professional look */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {coords.origin && (
          <Marker position={coords.origin} icon={originIcon}>
            <Popup>Origin: {origin}</Popup>
          </Marker>
        )}

        {coords.destination && (
          <Marker position={coords.destination} icon={destinationIcon}>
            <Popup>Destination: {destination}</Popup>
          </Marker>
        )}

        {coords.current && (
          <Marker position={coords.current} icon={shipIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">Current Location</p>
                <p className="text-sm">{currentLocation}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {pathPositions.length > 1 && (
          <Polyline 
            positions={pathPositions} 
            color="var(--accent-gold)" 
            weight={3} 
            dashArray="10, 10" 
            opacity={0.8}
          />
        )}
      </MapContainer>
    </Box>
  );
}
