import React, { useRef, useEffect } from 'react';

export default function SaturnRings() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    let animationFrameId;
    let time = 0;

    // Define the rings
    const numRings = 25;
    const rings = [];
    
    for (let i = 0; i < numRings; i++) {
      rings.push({
        radiusX: 200 + (i * 35),
        radiusY: 60 + (i * 12),
        speed: 0.001 + (Math.random() * 0.002),
        offset: Math.random() * Math.PI * 2,
        lineWidth: 1 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.4
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2 - 100; // Offset upwards slightly
      
      // Draw a subtle glow in the center
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 600);
      gradient.addColorStop(0, 'rgba(30, 170, 180, 0.15)');
      gradient.addColorStop(1, 'rgba(4, 8, 20, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      time += 1;

      // Draw rings
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, ring.radiusX, ring.radiusY, 0, 0, Math.PI * 2);
        
        // Create a sweeping gradient effect along the ring
        // We simulate this by rotating a conic-like linear gradient, or just using global alpha with dashed lines
        // A simpler way for a "sweeping" light effect is to draw the base ring dim, and a bright arc on top.
        
        // Base dim ring
        ctx.strokeStyle = `rgba(30, 170, 180, ${ring.opacity * 0.3})`;
        ctx.lineWidth = ring.lineWidth;
        ctx.stroke();

        // Bright sweeping segment
        const currentAngle = (time * ring.speed) + ring.offset;
        const arcLength = Math.PI / 2; // 90 degree bright spot
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, ring.radiusX, ring.radiusY, 0, currentAngle, currentAngle + arcLength);
        ctx.strokeStyle = `rgba(0, 240, 255, ${ring.opacity * 1.5})`;
        ctx.lineWidth = ring.lineWidth * 1.5;
        // Adding glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }
      
      // Draw some floating dust/stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for(let i=0; i < 50; i++) {
        const x = (Math.sin(time * 0.001 + i) * 0.5 + 0.5) * width;
        const y = (Math.cos(time * 0.0015 + i) * 0.5 + 0.5) * height;
        ctx.beginPath();
        ctx.arc(x, y, i % 2 === 0 ? 1 : 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        background: 'transparent'
      }}
    />
  );
}
