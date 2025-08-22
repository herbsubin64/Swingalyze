// Advanced Video Player for Golf Swing Analysis (Greenside AI Style)
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw, Settings,
  Maximize, Minimize, Clock, Zap, Target, Pen, Square, Circle
} from 'lucide-react';

export default function AdvancedVideoPlayer({ 
  src, 
  swingData = null, 
  onAnalysisRequest,
  analysisResults = null 
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [annotationMode, setAnnotationMode] = useState(null); // 'line', 'circle', 'square'
  const [annotations, setAnnotations] = useState([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Swing phases for frame analysis
  const swingPhases = [
    { name: 'Address', time: 0, color: '#3b82f6' },
    { name: 'Takeaway', time: 0.5, color: '#10b981' },
    { name: 'Top', time: 1.2, color: '#f59e0b' },
    { name: 'Downswing', time: 1.8, color: '#ef4444' },
    { name: 'Impact', time: 2.1, color: '#8b5cf6' },
    { name: 'Follow Through', time: 2.8, color: '#06b6d4' }
  ];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedData = () => {
      setIsVideoLoaded(true);
      setVideoError(null);
    };
    const handleError = (e) => {
      console.error('Video error:', e);
      setVideoError('Video format not supported. Please try MP4 format.');
      setIsVideoLoaded(false);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // Draw overlays and annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showAnnotations && analysisResults) {
      // Draw swing path
      if (analysisResults.swingPath && analysisResults.swingPath.length > 1) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(
          analysisResults.swingPath[0].x * canvas.width,
          analysisResults.swingPath[0].y * canvas.height
        );
        analysisResults.swingPath.slice(1).forEach(point => {
          ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw key positions
      if (analysisResults.keyPositions) {
        analysisResults.keyPositions.forEach(pos => {
          ctx.fillStyle = pos.color || '#ef4444';
          ctx.beginPath();
          ctx.arc(pos.x * canvas.width, pos.y * canvas.height, 8, 0, 2 * Math.PI);
          ctx.fill();
          
          if (pos.label) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Inter';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(pos.label, pos.x * canvas.width + 12, pos.y * canvas.height - 12);
            ctx.fillText(pos.label, pos.x * canvas.width + 12, pos.y * canvas.height - 12);
          }
        });
      }

      // Draw reference lines
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Target line
      ctx.beginPath();
      ctx.moveTo(0, canvas.height * 0.15);
      ctx.lineTo(canvas.width, canvas.height * 0.15);
      ctx.stroke();
      
      // Swing plane line
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.2, 0);
      ctx.lineTo(canvas.width * 0.8, canvas.height);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }

    // Draw user annotations
    annotations.forEach(annotation => {
      ctx.strokeStyle = annotation.color || '#ff0000';
      ctx.lineWidth = 3;
      
      switch (annotation.type) {
        case 'line':
          ctx.beginPath();
          ctx.moveTo(annotation.startX, annotation.startY);
          ctx.lineTo(annotation.endX, annotation.endY);
          ctx.stroke();
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(annotation.centerX, annotation.centerY, annotation.radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        case 'square':
          ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
          break;
      }
    });
  }, [currentTime, showAnnotations, analysisResults, annotations]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const skipToPhase = (phaseTime) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = phaseTime;
  };

  const changePlaybackRate = (rate) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const frameStep = (direction) => {
    const video = videoRef.current;
    if (!video) return;
    const fps = 30; // Assume 30fps
    const frameTime = 1 / fps;
    video.currentTime += direction * frameTime;
  };

  const handleQuickAnalysis = async () => {
    if (!src || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // Simulate fast analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onAnalysisRequest?.(src);
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Analysis failed:', error);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative bg-black rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* Video Container */}
      <div className="relative aspect-video">
        {videoError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white p-8">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-semibold mb-2">Video Format Not Supported</h3>
              <p className="text-gray-300 mb-4">{videoError}</p>
              <p className="text-sm text-gray-400">
                Try converting your .MOV file to .MP4 format, or use a different video file.
              </p>
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/mp4,video/webm';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const newUrl = URL.createObjectURL(file);
                      // This would need to be passed back to parent component
                      console.log('New video selected:', newUrl);
                    }
                  };
                  input.click();
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Select Different Video
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={src}
            className="w-full h-full object-contain"
            onClick={togglePlayPause}
            preload="metadata"
          >
            <source src={src} type="video/mp4" />
            <source src={src} type="video/webm" />
            <source src={src} type="video/quicktime" />
            Your browser does not support the video tag.
          </video>
        )}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ mixBlendMode: 'screen' }}
        />
        
        {/* Analysis Progress Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 text-center max-w-sm">
              <Zap className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-lg font-semibold mb-2">Quick Analysis</h3>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600">{analysisProgress}% Complete</p>
            </div>
          </div>
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && !isAnalyzing && (
          <div 
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={togglePlayPause}
          >
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
              <Play className="h-12 w-12 text-white" />
            </div>
          </div>
        )}

        {/* Time Display */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-lg font-mono text-sm">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Analysis Status */}
        {analysisResults && (
          <div className="absolute top-4 left-4 bg-green-600/80 text-white px-3 py-1 rounded-lg text-sm font-medium">
            ✓ Analyzed
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-gray-900 text-white p-4">
        {/* Main Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => frameStep(-1)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Previous Frame"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            
            <button 
              onClick={togglePlayPause}
              className="p-3 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
            
            <button 
              onClick={() => frameStep(1)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Next Frame"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            <button 
              onClick={handleQuickAnalysis}
              disabled={isAnalyzing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span>Quick Analysis</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Playback Speed */}
            <select 
              value={playbackRate}
              onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={2}>2x</option>
            </select>

            <button 
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-2 rounded-lg transition-colors ${showAnnotations ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title="Toggle Annotations"
            >
              <Target className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Swing Phases */}
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Swing Phases</div>
          <div className="flex space-x-2 overflow-x-auto">
            {swingPhases.map((phase, index) => (
              <button
                key={index}
                onClick={() => skipToPhase(phase.time)}
                className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors"
                style={{ 
                  backgroundColor: `${phase.color}20`,
                  color: phase.color,
                  border: `1px solid ${phase.color}40`
                }}
              >
                {phase.name}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          
          {/* Phase Markers */}
          {swingPhases.map((phase, index) => (
            <div
              key={index}
              className="absolute top-0 w-1 h-2 rounded-full transform -translate-x-1/2"
              style={{ 
                left: `${(phase.time / duration) * 100}%`,
                backgroundColor: phase.color
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}