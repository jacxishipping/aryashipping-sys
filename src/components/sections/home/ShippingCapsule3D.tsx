'use client';

import * as React from 'react';
import { Suspense, useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  useGLTF,
  Environment,
  ContactShadows,
  PresentationControls,
  Float,
  MeshTransmissionMaterial,
  Html
} from '@react-three/drei';
import * as THREE from 'three';

function SUVModel({ active }: { active: boolean }) {
  const { scene } = useGLTF('/models/suv.glb');
  const group = useRef<THREE.Group>(null);

  const wheels = useMemo(() => {
    const foundWheels: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj.name.toLowerCase().includes('wheel') || obj.name.toLowerCase().includes('tire')) {
        foundWheels.push(obj);
      }
    });
    return foundWheels;
  }, [scene]);

  useFrame((state, delta) => {
    if (!active) return;

    wheels.forEach((wheel) => {
      wheel.rotateX(delta * 5);
    });

    if (group.current) {
      group.current.rotation.y += delta * 0.15;
    }
  });

  return <primitive object={scene} ref={group} scale={1.75} position={[0, -0.6, 0]} />;
}

function GlassCapsule() {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[2.5, 2.5, 6.2, 64, 1, true]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          thickness={0.2}
          chromaticAberration={0.05}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.1}
          temporalDistortion={0.1}
          clearcoat={1}
          attenuationDistance={0.5}
          attenuationColor="#ffffff"
          color="#f0faff"
        />
      </mesh>

      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[2.5, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <MeshTransmissionMaterial thickness={0.5} color="#f0faff" />
      </mesh>
      <mesh position={[0, -3.1, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[2.5, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <MeshTransmissionMaterial thickness={0.5} color="#f0faff" />
      </mesh>

      <mesh position={[0, 2.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.48, 0.012, 16, 100]} />
        <meshStandardMaterial color="#aeefff" emissive="#aeefff" emissiveIntensity={12} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, -2.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.48, 0.012, 16, 100]} />
        <meshStandardMaterial color="#aeefff" emissive="#aeefff" emissiveIntensity={12} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function Scene() {
  const [active, setActive] = useState(false);
  const rootGroup = useRef<THREE.Group>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setActive(true), 500);
    return () => clearTimeout(timeout);
  }, []);

  useFrame((state, delta) => {
    if (active && rootGroup.current) {
      rootGroup.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
    }
  });

  return (
    <group ref={rootGroup} scale={[0, 0, 0]}>
      <PresentationControls
        global
        rotation={[0, 0, 0]}
        polar={[-Math.PI / 6, Math.PI / 6]}
        azimuth={[-Math.PI / 4, Math.PI / 4]}
      >
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <GlassCapsule />
            <group rotation={[0, 0, -Math.PI / 2]}>
              <Suspense fallback={<Html center><div className="text-[var(--accent-gold)] font-black uppercase tracking-widest text-xs">Loading...</div></Html>}>
                <SUVModel active={active} />
              </Suspense>
            </group>
          </group>
        </Float>
      </PresentationControls>
      <ContactShadows position={[0, -4.5, 0]} opacity={0.4} scale={20} blur={2.5} far={4.5} />
    </group>
  );
}

export default function ShippingCapsule3D({ className }: { className?: string }) {
  return (
    <div className={className} style={{ height: '100%', width: '100%' }}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 12], fov: 35 }}>
        <Suspense fallback={null}>
          <Environment preset="city" />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={1} />
          <ambientLight intensity={0.5} />
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/models/suv.glb');
