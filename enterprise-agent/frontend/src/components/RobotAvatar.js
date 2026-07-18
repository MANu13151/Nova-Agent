import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// --- Materials ---
const suitMaterial = new THREE.MeshStandardMaterial({ 
  color: '#ffffff', roughness: 0.3, metalness: 0.1 
});
const visorMaterial = new THREE.MeshStandardMaterial({ 
  color: '#0d051a', roughness: 0.1, metalness: 0.8, envMapIntensity: 2
});
const alienMaterial = new THREE.MeshStandardMaterial({
  color: '#5dbb63', roughness: 0.4, metalness: 0.1
});
const blackMaterial = new THREE.MeshStandardMaterial({
  color: '#111111', roughness: 0.5, metalness: 0.1
});
const accentMaterial = new THREE.MeshStandardMaterial({
  color: '#e6e6e6', roughness: 0.4, metalness: 0.2
});

function AstronautWithAlien({ isTalking, isThinking }) {
  const group = useRef();
  const ring1 = useRef();
  const ring2 = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      // Gentle floating up and down
      let extraYOffset = Math.sin(t * 2) * 0.1;
      
      if (isThinking) {
        // More active floating when thinking
        extraYOffset = Math.sin(t * 4) * 0.2;
      }
      
      // Center the group but float
      group.current.position.set(0, extraYOffset, 0);

      // Simple bobbing/swaying
      let rotX = Math.sin(t / 2) * 0.1;
      let rotY = Math.sin(t / 4) * 0.1;

      if (isTalking) {
        // Enthusiastic nodding when talking
        rotX += Math.abs(Math.sin(t * 10)) * 0.2;
      }

      group.current.rotation.x = rotX;
      group.current.rotation.y = rotY;
      group.current.rotation.z = 0;

      // Animate alien rings
      if (ring1.current && ring2.current) {
        ring1.current.rotation.x = t;
        ring1.current.rotation.y = t * 0.5;
        ring2.current.rotation.x = -t;
        ring2.current.rotation.y = -t * 0.5;
        
        if (isThinking || isTalking) {
          ring1.current.rotation.x *= 2;
          ring2.current.rotation.x *= 2;
        }
      }
    }
  });

  return (
    <group ref={group}>

      <Float speed={3} rotationIntensity={0.2} floatIntensity={1} floatingRange={[-0.1, 0.1]}>
        
        {/* --- ASTRONAUT --- */}
        {/* Head */}
        <mesh position={[0, 0.5, 0]} material={suitMaterial}>
          <sphereGeometry args={[0.35, 32, 32]} />
          {/* Visor */}
          <mesh position={[0, 0.0, 0.22]} rotation={[0, 0, Math.PI / 2]} material={visorMaterial}>
            <capsuleGeometry args={[0.15, 0.25, 32, 32]} />
          </mesh>
          {/* Ear modules */}
          <mesh position={[-0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={suitMaterial}>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
          </mesh>
          <mesh position={[0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={suitMaterial}>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 16]} />
          </mesh>
        </mesh>

        {/* Body */}
        <mesh position={[0, -0.05, 0]} material={suitMaterial}>
          <capsuleGeometry args={[0.22, 0.25, 32, 32]} />
          {/* Chest control panel */}
          <mesh position={[-0.05, 0.05, 0.22]} material={accentMaterial}>
            <boxGeometry args={[0.15, 0.12, 0.02]} />
            <mesh position={[0.03, -0.02, 0.01]} material={alienMaterial}>
              <sphereGeometry args={[0.02, 16, 16]} />
            </mesh>
          </mesh>
        </mesh>

        {/* Arms */}
        <mesh position={[-0.28, -0.05, 0]} rotation={[0, 0, -0.2]} material={suitMaterial}>
          <capsuleGeometry args={[0.06, 0.18, 16, 16]} />
          <mesh position={[0, -0.12, 0]} material={suitMaterial}>
            <sphereGeometry args={[0.07, 16, 16]} />
          </mesh>
        </mesh>
        <mesh position={[0.28, -0.05, 0]} rotation={[0, 0, 0.2]} material={suitMaterial}>
          <capsuleGeometry args={[0.06, 0.18, 16, 16]} />
          <mesh position={[0, -0.12, 0]} material={suitMaterial}>
            <sphereGeometry args={[0.07, 16, 16]} />
          </mesh>
        </mesh>

        {/* Legs */}
        <mesh position={[-0.1, -0.35, 0]} material={suitMaterial}>
          <capsuleGeometry args={[0.07, 0.1, 16, 16]} />
          <mesh position={[0, -0.08, 0.02]} material={suitMaterial}>
            <boxGeometry args={[0.12, 0.08, 0.14]} />
          </mesh>
        </mesh>
        <mesh position={[0.1, -0.35, 0]} material={suitMaterial}>
          <capsuleGeometry args={[0.07, 0.1, 16, 16]} />
          <mesh position={[0, -0.08, 0.02]} material={suitMaterial}>
            <boxGeometry args={[0.12, 0.08, 0.14]} />
          </mesh>
        </mesh>


        {/* --- LITTLE ALIEN ON TOP --- */}
        <group position={[0, 0.95, 0]}>
          {/* Alien Body/Head */}
          <mesh material={alienMaterial}>
            <sphereGeometry args={[0.18, 32, 32]} />
          </mesh>
          {/* Alien Eyes */}
          <mesh position={[-0.07, 0.03, 0.14]} rotation={[0.2, -0.3, 0]} material={blackMaterial}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <mesh position={[0.02, 0.02, 0.05]} material={suitMaterial}>
              <sphereGeometry args={[0.015, 8, 8]} />
            </mesh>
          </mesh>
          <mesh position={[0.07, 0.03, 0.14]} rotation={[0.2, 0.3, 0]} material={blackMaterial}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <mesh position={[0.02, 0.02, 0.05]} material={suitMaterial}>
              <sphereGeometry args={[0.015, 8, 8]} />
            </mesh>
          </mesh>
          {/* Alien Antennas */}
          <mesh position={[-0.08, 0.18, 0]} rotation={[0, 0, 0.2]} material={alienMaterial}>
            <cylinderGeometry args={[0.01, 0.01, 0.1]} />
            <mesh position={[0, 0.05, 0]} material={alienMaterial}>
              <sphereGeometry args={[0.03, 16, 16]} />
            </mesh>
          </mesh>
          <mesh position={[0.08, 0.18, 0]} rotation={[0, 0, -0.2]} material={alienMaterial}>
            <cylinderGeometry args={[0.01, 0.01, 0.1]} />
            <mesh position={[0, 0.05, 0]} material={alienMaterial}>
              <sphereGeometry args={[0.03, 16, 16]} />
            </mesh>
          </mesh>
          {/* Alien hands */}
          <mesh position={[-0.1, -0.15, 0.12]} material={alienMaterial}>
            <sphereGeometry args={[0.04, 16, 16]} />
          </mesh>
          <mesh position={[0.1, -0.15, 0.12]} material={alienMaterial}>
            <sphereGeometry args={[0.04, 16, 16]} />
          </mesh>
        </group>

      </Float>
    </group>
  );
}

export default function RobotAvatar({ isTalking, isThinking }) {
  return (
    <div style={{ width: '96px', height: '96px', pointerEvents: 'none' }}>
      <Canvas 
        camera={{ position: [0, 0, 4], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} color="#aaddff" />
        
        <AstronautWithAlien isTalking={isTalking} isThinking={isThinking} />
      </Canvas>
    </div>
  );
}
