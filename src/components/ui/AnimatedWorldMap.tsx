'use client';

import { motion } from 'framer-motion';

export default function AnimatedWorldMap() {
  // Approximate coordinates for the viewport 0 0 950 620
  // New coordinates adjusted for standard low-res wiki world map.
  // USA/Canada origins, Mersin/UAE route options, and Afghanistan destination.

  const nodes = [
    { id: 'USA', x: 230, y: 220, label: 'USA' },
    { id: 'Canada', x: 250, y: 168, label: 'Canada' },
    { id: 'Mersin', x: 555, y: 230, label: 'Mersin' }, 
    { id: 'UAE', x: 604, y: 306, label: 'UAE' },
    { id: 'Afghanistan', x: 620, y: 245, label: 'Afghanistan' }
  ];

  const paths = [
    {
      path: "M 230 220 Q 400 130 555 230",
      delay: 0,
      duration: 3
    },
    {
      path: "M 555 230 Q 580 220 620 245",
      delay: 2.5,
      duration: 1.5
    },
    {
      path: "M 250 168 Q 430 176 604 306",
      delay: 0.8,
      duration: 3
    },
    {
      path: "M 604 306 Q 624 286 620 245",
      delay: 3.3,
      duration: 1.5
    }
  ];

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* Map Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.12] dark:opacity-20">
        <div 
          className="w-full h-full max-w-[1400px] bg-no-repeat bg-center bg-contain" 
          style={{ 
            backgroundImage: "url('/world-map.svg')",
            filter: "var(--map-filter, invert(1) brightness(0.5))" // Standard inverted for dark backgrounds
          }} 
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 950 620"
          className="w-full h-full max-w-[1400px] object-contain object-center"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0" />
              <stop offset="25%" stopColor="var(--accent-gold)" stopOpacity="0.8" />
              <stop offset="75%" stopColor="var(--accent-gold)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Paths and Moving Vehicles */}
          {paths.map((p, i) => (
            <g key={`path-group-${i}`}>
              <motion.path
                d={p.path}
                fill="none"
                stroke="url(#line-gradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="4 4"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: [0, 1, 1],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: p.duration * 2,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                  repeatDelay: 1
                }}
              />
              
              {/* Unique Airplane/Ship SVG moving along the path */}
              <motion.g
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  offsetDistance: ["0%", "100%", "100%", "100%"]
                }}
                transition={{
                  duration: p.duration * 2,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeOut",
                  repeatDelay: 1
                }}
                style={{
                  offsetPath: `path('${p.path}')`
                } as any}
              >
                {i === 0 ? (
                  // Ship SVG for origin to the first route option.
                  <g transform="translate(-12, -12) scale(0.6)">
                    <path 
                      d="M32 18H29V14C29 12.8954 28.1046 12 27 12H13C11.8954 12 11 12.8954 11 14V18H8C6.67157 18 5.43432 18.7369 4.81977 19.897L2.1795 24.8841C1.94248 25.3318 2.26873 25.8696 2.77663 25.8696H37.2234C37.7313 25.8696 38.0575 25.3318 37.8205 24.8841L35.1802 19.897C34.5657 18.7369 33.3284 18 32 18Z" 
                      fill="var(--accent-gold)"
                    />
                    <path
                      d="M20 7C20 6.44772 20.4477 6 21 6H25V12H20V7Z"
                      fill="var(--accent-gold)"
                    />
                    <path
                      d="M2 28C2 28 5 30 10 30C15 30 20 28 20 28C20 28 25 30 30 30C35 30 38 28 38 28"
                      stroke="var(--accent-gold)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>
                ) : (
                  // Airplane SVG for route movement into Afghanistan.
                  <g transform="translate(-12, -12) scale(0.6)">
                    <path 
                      d="M19.167 4.195C19.5397 3.51139 20.4603 3.51139 20.833 4.195L24.821 11.5126H35.8457C36.9387 11.5126 37.6406 12.6738 37.149 13.666L33.0039 22.0321L36.8837 32.222C37.1352 32.8824 36.6473 33.6006 35.9388 33.6006H30.434L20.833 22.0321L14.7335 22.0321L9.17647 31.9688C8.82524 32.597 8.16362 33 7.44738 33H4.07261C3.41505 33 2.94636 32.3551 3.14902 31.7226L7.17865 19.1418L3.14902 6.561C2.94636 5.92854 3.41505 5.28366 4.07261 5.28366H7.44738C8.16362 5.28366 8.82524 5.68662 9.17647 6.31481L14.7335 16.2515H20.833L19.167 4.195Z" 
                      fill="var(--accent-gold)"
                    />
                  </g>
                )}
              </motion.g>
            </g>
          ))}

          {/* Location Nodes (Unique SVG Markers instead of dots) */}
          {nodes.map((node, i) => (
            <g key={`node-${i}`}>
              {/* Unique Location Pin SVG */}
              <motion.g
                transform={`translate(${node.x - 10}, ${node.y - 20})`}
                initial={{ scale: 0, opacity: 0, y: -10 }}
                animate={{
                  scale: [0, 1.1, 1],
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  duration: 0.8,
                  ease: "backOut",
                  delay: i * 0.3 + 0.5
                }}
              >
                <path
                  d="M10 0C4.47715 0 0 4.47715 0 10C0 17 10 24 10 24C10 24 20 17 20 10C20 4.47715 15.5228 0 10 0ZM10 14C7.79086 14 6 12.2091 6 10C6 7.79086 7.79086 6 10 6C12.2091 6 14 7.79086 14 10C14 12.2091 12.2091 14 10 14Z"
                  fill="var(--accent-gold)"
                  filter="url(#glow)"
                />
              </motion.g>

              {/* Radar pulse around the pin */}
              <motion.ellipse
                cx={node.x}
                cy={node.y}
                rx="14"
                ry="7"
                fill="none"
                stroke="var(--accent-gold)"
                strokeWidth="1.5"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{
                  scale: 4.5,
                  opacity: 0,
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: i * 0.5
                }}
              />
              
              {/* Location Label */}
              <motion.text
                x={node.x}
                y={node.y - 28}
                fill="currentColor"
                className="text-[11px] font-bold text-[var(--text-primary)] tracking-wider"
                textAnchor="middle"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 0.9, y: 0 }}
                transition={{ delay: i * 0.3 + 1, duration: 1 }}
              >
                {node.label}
              </motion.text>
            </g>
          ))}
        </svg>
      </div>

      {/* Fade masks for edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)] via-transparent to-[var(--background)] opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-transparent to-[var(--background)] opacity-80" />
      
      {/* Radial vignette mask */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,var(--background)_80%)]" />
    </div>
  );
}
