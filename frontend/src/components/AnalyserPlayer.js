// Enhanced Video Player with Swing Overlays for SwingAlyze
import React, { useEffect, useRef, useState } from 'react';

export default function AnalyserPlayer({ src, overlay = [], onFrame, swingPath = [] }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    const onUpdate = () => {
      setTime(v.currentTime);
      onFrame && onFrame(v.currentTime);
      drawOverlay();
    };
    
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    
    v.addEventListener('timeupdate', onUpdate);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    
    return () => {
      v.removeEventListener('timeupdate', onUpdate);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [overlay, swingPath, onFrame]);

  function drawOverlay() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    
    const ctx = c.getContext('2d');
    if (!ctx) return;
    
    c.width = v.videoWidth || v.clientWidth;
    c.height = v.videoHeight || v.clientHeight;
    ctx.clearRect(0, 0, c.width, c.height);

    // Draw swing path
    if (swingPath.length > 1) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#10b981'; // Green swing path
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(swingPath[0].x * c.width, swingPath[0].y * c.height);
      swingPath.slice(1).forEach(p => ctx.lineTo(p.x * c.width, p.y * c.height));
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw overlay points (ball position, club head, etc.)
    if (overlay.length > 0) {
      overlay.forEach((point, index) => {
        ctx.fillStyle = point.color || '#3b82f6';
        ctx.beginPath();
        ctx.arc(point.x * c.width, point.y * c.height, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add labels
        if (point.label) {
          ctx.fillStyle = '#fff';
          ctx.font = '12px Inter, sans-serif';
          ctx.fillText(point.label, point.x * c.width + 10, point.y * c.height - 10);
        }
      });
    }

    // Draw reference lines
    if (overlay.length > 0) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Target line
      ctx.beginPath();
      ctx.moveTo(0, c.height * 0.1);
      ctx.lineTo(c.width, c.height * 0.1);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg bg-black">
      <video 
        ref={videoRef} 
        src={src} 
        controls 
        className="w-full h-auto bg-black"
        onLoadedMetadata={drawOverlay}
      />
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Enhanced Time Display */}
      <div className="absolute bottom-2 right-3 bg-black/70 text-white px-3 py-1 rounded-lg text-sm font-mono">
        {time.toFixed(2)}s
      </div>
      
      {/* Play Status Indicator */}
      {isPlaying && (
        <div className="absolute top-4 right-4 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
          ANALYZING
        </div>
      )}
    </div>
  );
}