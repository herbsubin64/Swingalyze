import React, { useState, useRef, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RealTimeAnalysis = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [poseData, setPoseData] = useState(null);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize camera and WebSocket connection
  const startRealTimeAnalysis = async () => {
    try {
      setError(null);
      
      // Get camera access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Connect to WebSocket
      const wsUrl = BACKEND_URL.replace('http', 'ws') + '/api/ws/realtime-analysis';
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        setIsStreaming(true);
        startFrameCapture();
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      wsRef.current.onerror = (error) => {
        setError('WebSocket connection failed. Please check your connection.');
        console.error('WebSocket error:', error);
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        setIsStreaming(false);
      };
      
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions and try again.');
      console.error('Camera error:', err);
    }
  };

  // Stop real-time analysis
  const stopRealTimeAnalysis = () => {
    setIsStreaming(false);
    setIsConnected(false);
    setPoseData(null);
    
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Capture and send frames to backend
  const startFrameCapture = () => {
    if (!isStreaming || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to base64 and send to backend
      canvas.toBlob((blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'video_frame',
                frame_data: base64
              }));
            }
          };
          reader.readAsDataURL(blob);
        }
      }, 'image/jpeg', 0.8);
    }
    
    // Continue capturing frames
    if (isStreaming) {
      setTimeout(startFrameCapture, 100); // 10 FPS
    }
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'analyzed_frame':
        // Display the analyzed frame with ghost skeleton
        if (data.annotated_frame) {
          displayAnalyzedFrame(data.annotated_frame);
        }
        
        // Update pose data
        if (data.pose_data) {
          setPoseData(data.pose_data);
        }
        break;
        
      case 'error':
        setError(data.message);
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  // Display analyzed frame with ghost skeleton
  const displayAnalyzedFrame = (base64Frame) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      
      img.src = `data:image/jpeg;base64,${base64Frame}`;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRealTimeAnalysis();
    };
  }, []);

  return (
    <div className="realtime-analysis">
      <div className="realtime-header">
        <h2>🎥 Real-Time Swing Analysis</h2>
        <p>Get instant feedback with live ghost skeleton overlay</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="realtime-content">
        <div className="video-section">
          <div className="video-controls">
            {!isStreaming ? (
              <button 
                className="start-btn"
                onClick={startRealTimeAnalysis}
              >
                <span className="btn-icon">▶️</span>
                Start Real-Time Analysis
              </button>
            ) : (
              <button 
                className="stop-btn"
                onClick={stopRealTimeAnalysis}
              >
                <span className="btn-icon">⏹️</span>
                Stop Analysis
              </button>
            )}
            
            {isConnected && (
              <div className="connection-status">
                <span className="status-indicator connected"></span>
                Connected to SwingAlyze AI
              </div>
            )}
          </div>

          <div className="video-container">
            {/* Original video feed (hidden) */}
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              playsInline
              style={{ display: 'none' }}
            />
            
            {/* Canvas for displaying analyzed frames with ghost skeleton */}
            <canvas 
              ref={canvasRef}
              className="analysis-canvas"
              width="640" 
              height="480"
            />
            
            {!isStreaming && (
              <div className="video-placeholder">
                <div className="placeholder-icon">📹</div>
                <h3>Real-Time Analysis Ready</h3>
                <p>Click "Start Real-Time Analysis" to begin live ghost skeleton overlay</p>
              </div>
            )}
          </div>
        </div>

        {/* Live metrics panel */}
        {isStreaming && (
          <div className="live-metrics">
            <h3>👻 Live Ghost Skeleton Metrics</h3>
            
            {poseData ? (
              <div className="metrics-grid">
                <div className="metric-card">
                  <h4>Pose Quality</h4>
                  <div className="quality-meter">
                    <div 
                      className="quality-fill"
                      style={{ width: `${(poseData.quality_score || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span>{((poseData.quality_score || 0) * 100).toFixed(1)}%</span>
                </div>
                
                {poseData.angles && Object.entries(poseData.angles).map(([key, value]) => (
                  <div key={key} className="metric-card">
                    <h4>{formatAngleName(key)}</h4>
                    <span className="metric-value">{value.toFixed(1)}°</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-pose-detected">
                <div className="no-pose-icon">🤷</div>
                <p>Position yourself in front of the camera with good lighting for pose detection</p>
              </div>
            )}

            <div className="realtime-tips">
              <h4>💡 Real-Time Tips</h4>
              <ul>
                <li>Stand 6-8 feet away from the camera</li>
                <li>Ensure good lighting on your body</li>
                <li>Wear contrasting colors to background</li>
                <li>Keep your full body in frame</li>
                <li>Practice slow swings for better analysis</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="realtime-features">
        <h3>Real-Time Analysis Features</h3>
        <div className="features-list">
          <div className="feature-item">
            <span className="feature-icon">👻</span>
            <div>
              <h4>Live Ghost Skeleton</h4>
              <p>See your body mechanics in real-time with skeleton overlay</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📐</span>
            <div>
              <h4>Instant Angle Measurements</h4>
              <p>Live tracking of joint angles and posture metrics</p>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <div>
              <h4>Immediate Feedback</h4>
              <p>Get instant visual feedback to improve your setup and swing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to format angle names
const formatAngleName = (key) => {
  return key.replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('Angle', '');
};

export default RealTimeAnalysis;