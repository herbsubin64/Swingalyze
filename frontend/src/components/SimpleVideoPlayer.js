// Simple Video Player Fallback for SwingAlyze
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, AlertTriangle, Upload } from 'lucide-react';

export default function SimpleVideoPlayer({ src, onVideoError }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Video playback error:', e);
      setHasError(true);
      setErrorMessage('Video format not supported by your browser. Please try an MP4 file.');
      onVideoError?.(e);
    };
    const handleLoadStart = () => {
      setHasError(false);
      setErrorMessage('');
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
    };
  }, [onVideoError]);

  const togglePlayPause = () => {
    if (hasError) return;
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(e => {
        console.error('Play failed:', e);
        setHasError(true);
        setErrorMessage('Could not play video. Browser might not support this format.');
      });
    }
  };

  if (hasError) {
    return (
      <div className="aspect-video bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-600">
        <div className="text-center text-white p-8">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-xl font-semibold mb-2">Video Playback Error</h3>
          <p className="text-gray-300 mb-4">{errorMessage}</p>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• .MOV files may not be supported in all browsers</p>
            <p>• Try converting to .MP4 format</p>
            <p>• Or use Chrome/Safari for better .MOV support</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        controls
        preload="metadata"
        onClick={togglePlayPause}
      >
        <source src={src} type="video/mp4" />
        <source src={src} type="video/webm" />
        <source src={src} type="video/quicktime" />
        Your browser does not support the video tag.
      </video>
      
      {/* Simple play overlay */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
          onClick={togglePlayPause}
        >
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30 transition-colors">
            <Play className="h-12 w-12 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}