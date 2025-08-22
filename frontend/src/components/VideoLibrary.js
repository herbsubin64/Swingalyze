import React from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VideoLibrary = ({ uploads, onAnalyze, onDelete, onRefresh, isLoading }) => {
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get video URL
  const getVideoUrl = (videoId) => {
    return `${API}/uploads/${videoId}`;
  };

  // Get ghost skeleton URL
  const getGhostSkeletonUrl = (videoId) => {
    return `${API}/ghost-skeleton/${videoId}`;
  };

  if (uploads.length === 0) {
    return (
      <div className="video-library">
        <div className="library-header">
          <h2>📚 Video Library</h2>
          <button className="refresh-btn" onClick={onRefresh} disabled={isLoading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            Refresh
          </button>
        </div>
        <div className="empty-state">
          <div className="empty-icon">⛳</div>
          <h3>No swing videos yet</h3>
          <p>Upload your first golf swing video to get started with AI analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-library">
      <div className="library-header">
        <h2>📚 Video Library ({uploads.length})</h2>
        <button className="refresh-btn" onClick={onRefresh} disabled={isLoading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
          </svg>
          Refresh
        </button>
      </div>
      
      <div className="video-grid">
        {uploads.map((upload) => (
          <div key={upload.id} className="video-card">
            <div className="video-preview">
              <video 
                width="100%" 
                height="200" 
                controls 
                preload="metadata"
                className="video-player"
              >
                <source src={getVideoUrl(upload.id)} type={upload.content_type} />
                Your browser does not support the video tag.
              </video>
            </div>
            
            <div className="video-info">
              <h3 className="video-title" title={upload.original_filename}>
                {upload.original_filename}
              </h3>
              
              <div className="video-meta">
                <div className="meta-item">
                  <span className="meta-label">Size:</span>
                  <span className="meta-value">{formatFileSize(upload.file_size)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Format:</span>
                  <span className="meta-value">{upload.content_type}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Uploaded:</span>
                  <span className="meta-value">{formatDate(upload.upload_timestamp)}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Status:</span>
                  <span className={`status-badge ${upload.status}`}>{upload.status}</span>
                </div>
              </div>
              
              <div className="video-actions">
                <button 
                  onClick={() => onAnalyze(upload.id)}
                  className="action-btn analyze-btn"
                  title="Analyze swing with Ghost Skeleton"
                  disabled={isLoading}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4m6-6h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m-6 0V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/>
                  </svg>
                  {isLoading ? 'Analyzing...' : 'Analyze Swing'}
                </button>
                
                <a 
                  href={getVideoUrl(upload.id)} 
                  download={upload.original_filename}
                  className="action-btn download-btn"
                  title="Download original video"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download
                </a>
                
                <button 
                  onClick={() => onDelete(upload.id)}
                  className="action-btn delete-btn"
                  title="Delete video and analysis"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
                    <path d="M10,11v6"/>
                    <path d="M14,11v6"/>
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="library-info">
        <div className="info-card">
          <h3>📊 Analysis Features</h3>
          <ul>
            <li><strong>Ghost Skeleton:</strong> AI-powered pose detection overlay</li>
            <li><strong>Swing Phases:</strong> Automatic breakdown of your swing</li>
            <li><strong>Biomechanics:</strong> Joint angles and body mechanics analysis</li>
            <li><strong>Recommendations:</strong> Personalized improvement tips</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VideoLibrary;