import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';

function Palette3D({ placement, truckHeight }) {
  const { x, y, placedWidth, placedHeight, color, ref, height } = placement;
  const h3d = (height || 1500) / 10 / 100; // mm -> m
  const px = (x + placedWidth / 2) / 100;
  const pz = (y + placedHeight / 2) / 100;
  const pw = placedWidth / 100;
  const pd = placedHeight / 100;

  return (
    <group position={[px, h3d / 2, pz]}>
      <mesh>
        <boxGeometry args={[pw, h3d, pd]} />
        <meshStandardMaterial color={color || '#94a3b8'} transparent opacity={0.85} />
      </mesh>
      <mesh>
        <boxGeometry args={[pw, h3d, pd]} />
        <meshStandardMaterial color="#334155" wireframe />
      </mesh>
      {pw > 0.3 && (
        <Text
          position={[0, h3d / 2 + 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.15}
          color="#1e293b"
          anchorX="center"
          anchorY="middle"
        >
          {ref || '?'}
        </Text>
      )}
    </group>
  );
}

function TruckBox({ length, width, height }) {
  const l = length / 100;
  const w = width / 100;
  const h = height / 100;
  return (
    <group position={[l / 2, h / 2, w / 2]}>
      <mesh>
        <boxGeometry args={[l, h, w]} />
        <meshStandardMaterial color="#1e40af" transparent opacity={0.05} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(l, h, w)]} />
        <lineBasicMaterial color="#1e40af" />
      </lineSegments>
    </group>
  );
}

// We need THREE for edgesGeometry
import * as THREE from 'three';

export default function View3D({ truck, result, truckIndex }) {
  const placements = result?.trucks?.[truckIndex]?.placements || [];
  const camL = truck.length_cm / 100;

  return (
    <div className="w-full h-full min-h-[400px]">
      <Canvas
        camera={{ position: [camL / 2, 5, 8], fov: 50 }}
        style={{ background: '#f0f4f8' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        <TruckBox
          length={truck.length_cm}
          width={truck.width_cm}
          height={truck.height_cm}
        />

        {placements.map((p, i) => (
          <Palette3D key={i} placement={p} truckHeight={truck.height_cm} />
        ))}

        <Grid
          args={[20, 20]}
          position={[camL / 2, -0.01, truck.width_cm / 200]}
          cellSize={1}
          cellColor="#94a3b8"
          sectionSize={5}
          sectionColor="#64748b"
          fadeDistance={30}
        />

        <OrbitControls
          target={[camL / 2, 1, truck.width_cm / 200]}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
