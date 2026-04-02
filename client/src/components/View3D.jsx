import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function Palette3D({ placement, truckHeight }) {
  const { x, y, placedWidth, placedHeight, color, ref, height } = placement;
  const h3d = (height || 1500) / 10 / 100; // mm -> m
  const px = (x + placedWidth / 2) / 100;
  const pz = (y + placedHeight / 2) / 100;
  const pw = placedWidth / 100;
  const pd = placedHeight / 100;

  return (
    <group position={[px, h3d / 2, pz]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[pw, h3d, pd]} />
        <meshStandardMaterial color={color || '#94a3b8'} transparent opacity={0.9} roughness={0.6} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(pw, h3d, pd)]} />
        <lineBasicMaterial color="#1e293b" opacity={0.5} transparent />
      </lineSegments>
      {pw > 0.3 && (
        <Text
          position={[0, h3d / 2 + 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.12}
          color="#1e293b"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {ref || '?'}
        </Text>
      )}
    </group>
  );
}

function TruckTrailer({ length, width, height }) {
  const l = length / 100;
  const w = width / 100;
  const h = height / 100;
  const wallThickness = 0.02;
  const wallColor = '#475569';
  const floorColor = '#64748b';

  return (
    <group>
      {/* Floor */}
      <mesh position={[l / 2, -wallThickness / 2, w / 2]} receiveShadow>
        <boxGeometry args={[l, wallThickness, w]} />
        <meshStandardMaterial color={floorColor} roughness={0.8} />
      </mesh>
      {/* Left wall */}
      <mesh position={[l / 2, h / 2, -wallThickness / 2]}>
        <boxGeometry args={[l, h, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      {/* Right wall */}
      <mesh position={[l / 2, h / 2, w + wallThickness / 2]}>
        <boxGeometry args={[l, h, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
      {/* Back wall (closed end) */}
      <mesh position={[-wallThickness / 2, h / 2, w / 2]}>
        <boxGeometry args={[wallThickness, h, w]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      {/* Roof */}
      <mesh position={[l / 2, h + wallThickness / 2, w / 2]}>
        <boxGeometry args={[l, wallThickness, w]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
      {/* Corner edges for visibility */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(l, h, w)]} />
        <lineBasicMaterial color="#1e40af" opacity={0.6} transparent />
      </lineSegments>
      <group position={[l / 2, h / 2, w / 2]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(l, h, w)]} />
          <lineBasicMaterial color="#1e40af" opacity={0.6} transparent />
        </lineSegments>
      </group>
    </group>
  );
}

export default function View3D({ truck, result, truckIndex }) {
  const placements = result?.trucks?.[truckIndex]?.placements || [];
  const l = truck.length_cm / 100;
  const w = truck.width_cm / 100;

  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        shadows
        camera={{ position: [l * 0.7, 4, w + 5], fov: 45 }}
        style={{ background: 'linear-gradient(180deg, #e0e7ff 0%, #f0f4f8 100%)' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[l, 8, w + 2]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={30}
          shadow-camera-left={-l}
          shadow-camera-right={l}
          shadow-camera-top={w + 2}
          shadow-camera-bottom={-2}
        />
        <directionalLight position={[-3, 4, -2]} intensity={0.3} />

        <TruckTrailer
          length={truck.length_cm}
          width={truck.width_cm}
          height={truck.height_cm}
        />

        {placements.map((p, i) => (
          <Palette3D key={i} placement={p} truckHeight={truck.height_cm} />
        ))}

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[l / 2, -0.02, w / 2]} receiveShadow>
          <planeGeometry args={[l + 4, w + 6]} />
          <meshStandardMaterial color="#cbd5e1" roughness={1} />
        </mesh>

        <OrbitControls
          target={[l / 2, 1, w / 2]}
          maxPolarAngle={Math.PI * 0.48}
          minDistance={2}
          maxDistance={25}
        />
      </Canvas>
    </div>
  );
}
