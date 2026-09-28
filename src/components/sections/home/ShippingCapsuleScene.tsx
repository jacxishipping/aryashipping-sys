'use client';

import { useEffect, useRef, useState } from 'react';

interface ShippingCapsuleSceneProps {
  className?: string;
}

export default function ShippingCapsuleScene({ className }: ShippingCapsuleSceneProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = scene.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
    };

    const handlePointerLeave = () => setTilt({ x: 0, y: 0 });

    scene.addEventListener('pointermove', handlePointerMove);
    scene.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      scene.removeEventListener('pointermove', handlePointerMove);
      scene.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      aria-label="Premium glass capsule holding a white SUV for international vehicle shipping"
      className={className}
    >
      <div className="relative h-full w-full overflow-visible">
        <div className="absolute inset-x-[8%] bottom-[6%] h-[18%] rounded-full bg-[rgba(var(--text-primary-rgb),0.14)] blur-2xl" />
        <div className="absolute left-[12%] top-[16%] h-[62%] w-[76%] rounded-full bg-[rgba(var(--panel-rgb),0.72)] blur-3xl" />

        <div
          className="capsule-artwork absolute inset-0 will-change-transform"
          style={{
            transform: `perspective(1200px) rotateX(${tilt.y * -2.2}deg) rotateY(${tilt.x * 3.2}deg) translate3d(${tilt.x * 10}px, ${tilt.y * 6}px, 0)`,
          }}
        >
          <img
            src="/suv-glass-capsule.png"
            alt=""
            className="absolute left-[56%] top-1/2 z-10 w-[112%] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain drop-shadow-[0_34px_52px_rgba(var(--text-primary-rgb),0.18)] [mask-image:linear-gradient(90deg,transparent_0%,black_10%,black_100%)] sm:w-[106%] lg:left-[58%] lg:w-[108%]"
            draggable={false}
          />

          <div className="absolute left-[11%] top-[23%] z-20 h-px w-[74%] bg-[linear-gradient(90deg,transparent,rgba(202,240,255,0.92),transparent)] shadow-[0_0_18px_rgba(174,239,255,0.95)]" />
          <div className="absolute left-[16%] bottom-[24%] z-20 h-px w-[68%] bg-[linear-gradient(90deg,transparent,rgba(202,240,255,0.62),transparent)] shadow-[0_0_14px_rgba(174,239,255,0.75)]" />
        </div>

      </div>

      <style jsx>{`
        @keyframes capsuleFloat {
          0%,
          100% {
            translate: 0 0;
          }
          50% {
            translate: 0 -10px;
          }
        }
        @media (prefers-reduced-motion: no-preference) {
          .capsule-artwork {
            animation: capsuleFloat 7s ease-in-out infinite;
          }
        }
      `}</style>
    </div>
  );
}
