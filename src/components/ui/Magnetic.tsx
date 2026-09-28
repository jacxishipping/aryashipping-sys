'use client';

import React, { useRef, useState, ReactElement } from 'react';
import { motion } from 'framer-motion';

interface MagneticProps {
  children: ReactElement;
  intensity?: number;
  strength?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Magnetic({ children, intensity = 0.2, strength = 0.1, className = "", style = {} }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    if (!ref.current) return;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * intensity, y: middleY * intensity });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;
  
  return (
    <motion.div
      style={{ position: 'relative', display: 'inline-block', zIndex: 10, ...style }}
      className={className}
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  );
}
