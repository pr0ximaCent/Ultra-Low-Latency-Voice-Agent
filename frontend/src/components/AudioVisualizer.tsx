import React, { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  audioLevel?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  isActive, 
  audioLevel = 0 
}) => {
  const [bars, setBars] = useState<number[]>(new Array(20).fill(0));
  const animationRef = useRef<number>();
  
  useEffect(() => {
    if (isActive) {
      const animate = () => {
        setBars(prev => 
          prev.map(() => Math.random() * (audioLevel + 0.1) * 100)
        );
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      setBars(new Array(20).fill(0));
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);
  
  return (
    <div className="flex items-center justify-center space-x-1 h-16">
      {bars.map((height, index) => (
        <div
          key={index}
          className={`w-2 rounded-full transition-all duration-100 ${
            isActive 
              ? 'bg-gradient-to-t from-blue-500 to-cyan-400' 
              : 'bg-gray-300'
          }`}
          style={{ 
            height: `${Math.max(4, height)}px`,
            opacity: isActive ? 1 : 0.3
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;