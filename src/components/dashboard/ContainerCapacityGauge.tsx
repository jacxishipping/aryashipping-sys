'use client';

import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { Box as BoxIcon, Car, Scale, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export interface ContainerCapacityGaugeProps {
  containerType?: string; // e.g., '40HC', '40FT', '20FT', '45HC'
  itemCount: number;
  totalCBM?: number;
  totalWeightKg?: number;
  className?: string;
}

const CONTAINER_SPECS: Record<string, { maxCars: number; maxCBM: number; maxWeightKg: number; label: string }> = {
  '20FT': { maxCars: 2, maxCBM: 33.2, maxWeightKg: 21700, label: "20' Standard Dry" },
  '40FT': { maxCars: 3, maxCBM: 67.7, maxWeightKg: 26500, label: "40' Standard Dry" },
  '40HC': { maxCars: 4, maxCBM: 76.3, maxWeightKg: 26500, label: "40' High Cube" },
  '45HC': { maxCars: 5, maxCBM: 86.0, maxWeightKg: 27700, label: "45' High Cube" },
};

export function ContainerCapacityGauge({
  containerType = '40HC',
  itemCount,
  totalCBM,
  totalWeightKg,
}: ContainerCapacityGaugeProps) {
  // Normalize type
  const normalizedType = containerType.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const matchedKey = Object.keys(CONTAINER_SPECS).find((k) => normalizedType.includes(k)) || '40HC';
  const spec = CONTAINER_SPECS[matchedKey];

  // Default estimations if not explicitly given
  const estimatedCBM = totalCBM ?? itemCount * 14.5;
  const estimatedWeight = totalWeightKg ?? itemCount * 1750;

  const carPercent = Math.min(100, Math.round((itemCount / spec.maxCars) * 100));
  const cbmPercent = Math.min(100, Math.round((estimatedCBM / spec.maxCBM) * 100));
  const weightPercent = Math.min(100, Math.round((estimatedWeight / spec.maxWeightKg) * 100));

  const isFull = itemCount >= spec.maxCars;
  const isOptimal = itemCount === spec.maxCars || (itemCount === spec.maxCars - 1 && cbmPercent > 70);

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2.5,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--panel)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BoxIcon size={18} style={{ color: 'var(--accent-gold)' }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            Stowing & Capacity Utilization
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.25,
            py: 0.4,
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 700,
            backgroundColor: isFull
              ? 'rgba(34, 197, 94, 0.12)'
              : isOptimal
              ? 'rgba(59, 130, 246, 0.12)'
              : 'rgba(234, 179, 8, 0.12)',
            color: isFull ? '#16a34a' : isOptimal ? '#2563eb' : '#b45309',
            border: `1px solid ${
              isFull
                ? 'rgba(34, 197, 94, 0.3)'
                : isOptimal
                ? 'rgba(59, 130, 246, 0.3)'
                : 'rgba(234, 179, 8, 0.3)'
            }`,
          }}
        >
          {isFull ? (
            <>
              <CheckCircle2 size={12} /> Stowed Full
            </>
          ) : isOptimal ? (
            <>
              <Sparkles size={12} /> Optimal Stowing
            </>
          ) : (
            <>
              <ShieldAlert size={12} /> {spec.maxCars - itemCount} Slots Available
            </>
          )}
        </Box>
      </Box>

      {/* Grid of Gauges */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        {/* Car Slots */}
        <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Car size={15} style={{ color: 'var(--text-secondary)' }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Vehicle Slots
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {itemCount} / {spec.maxCars}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={carPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(var(--text-primary-rgb), 0.08)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: carPercent === 100 ? '#16a34a' : 'var(--accent-gold)',
                borderRadius: 3,
              },
            }}
          />
          <Typography sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', mt: 0.75 }}>
            {spec.label} standard limit
          </Typography>
        </Box>

        {/* CBM Volume */}
        <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <BoxIcon size={15} style={{ color: 'var(--text-secondary)' }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Volume (CBM)
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {estimatedCBM.toFixed(1)} / {spec.maxCBM} m³
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={cbmPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(var(--text-primary-rgb), 0.08)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: cbmPercent > 90 ? '#ef4444' : '#2563eb',
                borderRadius: 3,
              },
            }}
          />
          <Typography sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', mt: 0.75 }}>
            {cbmPercent}% volumetric occupancy
          </Typography>
        </Box>

        {/* Payload Weight */}
        <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Scale size={15} style={{ color: 'var(--text-secondary)' }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Payload Weight
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {(estimatedWeight / 1000).toFixed(1)} / {(spec.maxWeightKg / 1000).toFixed(1)} T
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={weightPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(var(--text-primary-rgb), 0.08)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: weightPercent > 90 ? '#ef4444' : '#0d9488',
                borderRadius: 3,
              },
            }}
          />
          <Typography sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', mt: 0.75 }}>
            {weightPercent}% max permissible mass
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
