import React, { useState, useRef } from 'react';

const VideoUploader = ({ onUpload, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Handle mobile/tablet click to open file picker
  const handleUploadClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && fileInputRef.current) {
      console.log('Upload button clicked!'); // Debug log
      fileInputRef.current.click();
    }
  };

  // Handle upload zone click (for drag & drop area)
  const handleZoneClick = (e) => {
    // Only trigger if clicking on the zone itself, not the button
    if (e.target === e.currentTarget || e.target.closest('.upload-content')) {
      handleUploadClick(e);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      await onUpload(file, (progress) => {
        setUploadProgress(progress);
      });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="video-uploader">
      <div 
        className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.mp4,.avi,.mov,.mkv,.webm,.ogg,.3gp,.flv,.wmv"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
          multiple={false}
          capture="environment"
        />

        {!uploading ? (
          <div className="upload-content">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <h3>Tap to upload your golf swing video</h3>
            <p>or drag and drop your video file here</p>
            <div className="mobile-upload-btn">
              <button 
                type="button" 
                className="upload-btn-mobile"
                onClick={handleUploadClick}
                disabled={uploading}
              >
                📹 Choose Video File
              </button>
            </div>
            <div className="supported-formats">
              <p>Supports: MP4, AVI, MOV, MKV, WebM, OGG, 3GP, FLV, WMV</p>
              <p>Maximum file size: No limit (bulletproof upload)</p>
            </div>
          </div>
        ) : (
          <div className="upload-progress">
            <div className="progress-icon">
              <div className="spinner"></div>
            </div>
            <h3>Uploading your video...</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p>{uploadProgress}% complete</p>
            <p className="upload-tip">
              ⚡ Bulletproof upload in progress - won't timeout or get stuck!
            </p>
          </div>
        )}
      </div>

      <div className="upload-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-icon">🚀</span>
            <div>
              <h4>Fast & Reliable</h4>
              <p>Optimized for large video files</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">🛡️</span>
            <div>
              <h4>Never Times Out</h4>
              <p>Extended timeout protection</p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-icon">📹</span>
            <div>
              <h4>All Formats</h4>
              <p>Support for every video format</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoUploader;