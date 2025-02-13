import React, { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

interface SmoothDotVisualizerProps {
  isPlaying?: boolean;
}

const SmoothDotVisualizer: React.FC<SmoothDotVisualizerProps> = ({ isPlaying = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const config = {
      ringCount: 8,
      dotsPerRing: 24,
      dotSize: 2,
      baseRadius: 80,
      radiusStep: 30,
      glowSize: 4,
      dotColor: '150, 255, 180', // Light green RGB values
    };
    
    const animate = (time: number) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Changed to white background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      if (isPlaying) {
        // Draw each ring
        for (let ring = 0; ring < config.ringCount; ring++) {
          const radius = config.baseRadius + ring * config.radiusStep;
          const rotationSpeed = 0.0002 * (1 + ring * 0.1);
          const pulseSpeed = 0.001 * (1 + ring * 0.1);
          const baseOpacity = 1 - (ring / config.ringCount) * 0.7;
          
          // Add pulsing effect
          const pulseScale = 1 + Math.sin(time * pulseSpeed) * 0.1;
          const currentRadius = radius * pulseScale;
          
          // Draw dots in the ring
          for (let i = 0; i < config.dotsPerRing; i++) {
            const angle = (i / config.dotsPerRing) * Math.PI * 2 + time * rotationSpeed;
            
            const x = centerX + currentRadius * Math.cos(angle);
            const y = centerY + currentRadius * Math.sin(angle);
            
            // Create glowing dot effect
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, config.glowSize);
            gradient.addColorStop(0, `rgba(${config.dotColor}, ${baseOpacity})`);
            gradient.addColorStop(1, `rgba(${config.dotColor}, 0)`);
            
            ctx.beginPath();
            ctx.arc(x, y, config.glowSize, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw solid dot center
            ctx.beginPath();
            ctx.arc(x, y, config.dotSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${config.dotColor}, ${baseOpacity})`;
            ctx.fill();
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate(0);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);
  
  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-video bg-white">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      {/* Centered microphone icon with glowing effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-green-400/20 rounded-full blur-xl animate-pulse" />
          {/* Mic container */}
          <div className="relative w-12 h-12 bg-green-400/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Mic className="w-6 h-6 text-green-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmoothDotVisualizer;
