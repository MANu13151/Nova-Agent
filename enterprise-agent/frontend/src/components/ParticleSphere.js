import React, { useRef, useEffect } from 'react';

const ParticleSphere = ({ isListening }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions
    const width = 600;
    const height = 600;
    canvas.width = width;
    canvas.height = height;

    // Sphere parameters
    const particles = [];
    const particleCount = 800; // Hundreds of tiny dots
    const radius = 250;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize particles uniformly on a sphere
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * 2 * Math.PI; // 0 to 2pi
      const phi = Math.acos(2 * Math.random() - 1); // 0 to pi

      // Cartesian coordinates on sphere of radius 1
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);

      particles.push({
        x: x,
        y: y,
        z: z,
        baseSize: Math.random() * 1.5 + 0.5,
      });
    }

    let angleX = 0;
    let angleY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Speeds based on listening state
      const rotationSpeed = isListening ? 0.02 : 0.002;
      angleY += rotationSpeed;
      angleX += rotationSpeed * 0.5;

      // Pulse effect
      const pulse = isListening ? 1 + Math.sin(Date.now() / 150) * 0.05 : 1;
      const currentRadius = radius * pulse;

      // Draw background glow
      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, currentRadius);
      if (isListening) {
        bgGradient.addColorStop(0, 'rgba(0, 255, 170, 0.15)');
        bgGradient.addColorStop(0.5, 'rgba(0, 229, 255, 0.05)');
      } else {
        bgGradient.addColorStop(0, 'rgba(0, 229, 255, 0.08)');
        bgGradient.addColorStop(0.5, 'rgba(0, 136, 255, 0.02)');
      }
      bgGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = bgGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 1.2, 0, 2 * Math.PI);
      ctx.fill();

      // Precalculate sine/cosine for rotation
      const sinY = Math.sin(angleY);
      const cosY = Math.cos(angleY);
      const sinX = Math.sin(angleX);
      const cosX = Math.cos(angleX);

      // Sort particles by Z so closer ones are drawn last (optional for dots, but looks better)
      const projected = particles.map(p => {
        // Rotate around Y axis
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;
        
        // Rotate around X axis
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        // Perspective projection
        const perspective = 400 / (400 - z2 * currentRadius * 0.5); // pseudo 3D
        const px = centerX + x1 * currentRadius * perspective;
        const py = centerY + y2 * currentRadius * perspective;
        
        return {
          x: px,
          y: py,
          z: z2,
          size: p.baseSize * perspective * pulse,
          alpha: (z2 + 1) / 2 // Map z from -1..1 to 0..1 for opacity
        };
      });

      // Draw particles
      projected.forEach(p => {
        // Fade out particles on the back of the sphere slightly
        const alpha = Math.max(0.1, p.alpha);
        ctx.fillStyle = isListening ? `rgba(0, 255, 170, ${alpha})` : `rgba(0, 229, 255, ${alpha})`;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size), 0, 2 * Math.PI);
        ctx.fill();
        
        // Add tiny glow to closer particles
        if (p.z > 0.5) {
           ctx.shadowBlur = isListening ? 8 : 4;
           ctx.shadowColor = isListening ? '#00ffa2' : '#00e5ff';
        } else {
           ctx.shadowBlur = 0;
        }
      });

      ctx.shadowBlur = 0; // reset
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [isListening]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        width: '600px',
        height: '600px',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
};

export default ParticleSphere;
