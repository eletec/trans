import React, { useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../ThemeContext';

function Palette3D({ placement }) {
  const { x, y, placedWidth, placedHeight, color, ref, height, num, z } = placement;
  const h3d = (height || 1500) / 10 / 100; // mm -> m
  const px = (x + placedWidth / 2) / 100;
  const py = (z || 0) / 100 + h3d / 2;
  const pz = (y + placedHeight / 2) / 100;
  const pw = placedWidth / 100;
  const pd = placedHeight / 100;
  const label = `${ref || '?'} #${num || '?'}`;
  // Rotate top label to align with longest dimension
  const topRotZ = pd > pw ? Math.PI / 2 : 0;

  return (
    <group position={[px, py, pz]}>
      {/* Solid opaque box — no transparency avoids z-order issues */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[pw, h3d, pd]} />
        <meshStandardMaterial color={color || '#94a3b8'} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* Wireframe edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(pw, h3d, pd)]} />
        <lineBasicMaterial color="#1e293b" opacity={0.4} transparent />
      </lineSegments>
      {/* Top label — oriented along longest dimension */}
      <Text
        position={[0, h3d / 2 + 0.03, 0]}
        rotation={[-Math.PI / 2, 0, topRotZ]}
        fontSize={Math.min(0.14, Math.max(pw, pd) * 0.3)}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {label}
      </Text>
      {/* Front face label (z+ side) — text along width (pw) */}
      <Text
        position={[0, 0, pd / 2 + 0.01]}
        fontSize={Math.min(0.12, pw * 0.3, h3d * 0.3)}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {label}
      </Text>
      {/* Right side label (x+ side) — text along depth (pd) */}
      <Text
        position={[pw / 2 + 0.01, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={Math.min(0.12, pd * 0.3, h3d * 0.3)}
        color="#1e293b"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {label}
      </Text>
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
        <meshStandardMaterial color={wallColor} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Right wall */}
      <mesh position={[l / 2, h / 2, w + wallThickness / 2]}>
        <boxGeometry args={[l, h, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Back wall (closed end) */}
      <mesh position={[-wallThickness / 2, h / 2, w / 2]}>
        <boxGeometry args={[wallThickness, h, w]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Roof */}
      <mesh position={[l / 2, h + wallThickness / 2, w / 2]}>
        <boxGeometry args={[l, wallThickness, w]} />
        <meshStandardMaterial color={wallColor} transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Edge wireframe */}
      <group position={[l / 2, h / 2, w / 2]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(l, h, w)]} />
          <lineBasicMaterial color="#1e40af" opacity={0.6} transparent />
        </lineSegments>
      </group>
    </group>
  );
}

function ZoomControls({ controlsRef }) {
  const { camera } = useThree();
  const zoom = (factor) => {
    if (!controlsRef.current) return;
    const dir = new THREE.Vector3();
    dir.subVectors(camera.position, controlsRef.current.target).normalize();
    camera.position.addScaledVector(dir, factor);
    controlsRef.current.update();
  };
  return null;
}

export default function View3D({ truck, result, truckIndex }) {
  const rawPlacements = result?.trucks?.[truckIndex]?.placements || [];
  // Ensure num is set (may be missing from old saved projects)
  const placements = rawPlacements.map((p, i) => p.num ? p : { ...p, num: i + 1 });
  const l = truck.length_cm / 100;
  const w = truck.width_cm / 100;
  const controlsRef = useRef();
  const { darkMode } = useTheme();

  const canvasBg = darkMode
    ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
    : 'linear-gradient(180deg, #e0e7ff 0%, #f0f4f8 100%)';

  const zoomBtn = "w-8 h-8 flex items-center justify-center rounded-lg bg-white/90 shadow border border-gray-300 text-gray-700 hover:bg-gray-100 text-lg font-bold select-none cursor-pointer";

  return (
    <div className="w-full h-full min-h-[400px] relative">
      {/* Zoom buttons */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <button className={zoomBtn} onClick={() => {
          if (controlsRef.current) {
            const cam = controlsRef.current.object;
            const dir = new THREE.Vector3().subVectors(cam.position, controlsRef.current.target).normalize();
            cam.position.addScaledVector(dir, -1.5);
            controlsRef.current.update();
          }
        }} title="Zoom avant">+</button>
        <button className={zoomBtn} onClick={() => {
          if (controlsRef.current) {
            const cam = controlsRef.current.object;
            const dir = new THREE.Vector3().subVectors(cam.position, controlsRef.current.target).normalize();
            cam.position.addScaledVector(dir, 1.5);
            controlsRef.current.update();
          }
        }} title="Zoom arrière">−</button>
        <button className={zoomBtn + " text-sm"} onClick={() => {
          if (controlsRef.current) {
            const cam = controlsRef.current.object;
            cam.position.set(l * 0.7, 4, w + 5);
            controlsRef.current.target.set(l / 2, 1, w / 2);
            controlsRef.current.update();
          }
        }} title="Réinitialiser la vue">⌂</button>
      </div>
      <Canvas
        shadows
        camera={{ position: [l * 0.7, 4, w + 5], fov: 45 }}
        gl={{ sortObjects: true, alpha: false }}
        style={{ background: canvasBg }}
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

        {/* Render opaque palettes first */}
        {placements.map((p, i) => (
          <Palette3D key={i} placement={p} />
        ))}

        {/* Then transparent truck walls (renderOrder ensures correct layering) */}
        <TruckTrailer
          length={truck.length_cm}
          width={truck.width_cm}
          height={truck.height_cm}
        />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[l / 2, -0.02, w / 2]} receiveShadow>
          <planeGeometry args={[l + 4, w + 6]} />
          <meshStandardMaterial color="#cbd5e1" roughness={1} />
        </mesh>

        <OrbitControls
          ref={controlsRef}
          target={[l / 2, 1, w / 2]}
          maxPolarAngle={Math.PI * 0.48}
          minDistance={2}
          maxDistance={25}
        />
      </Canvas>
    </div>
  );
}
