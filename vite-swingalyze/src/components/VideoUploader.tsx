import React, { useState, useRef } from 'react';

interface VideoUploaderProps {
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<any>;
  isLoading: boolean;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onUpload, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input change triggered!', e.target.files);
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name);
      handleFileUpload(e.target.files[0]);
    }
  };

  // Handle mobile/tablet click to open file picker
  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading && fileInputRef.current) {
      console.log('Upload button clicked!');
      fileInputRef.current.click();
    }
  };

  // Handle upload zone click (for drag & drop area)
  const handleZoneClick = (e: React.MouseEvent) => {
    // Only trigger if clicking on the zone itself, not the button
    if (e.target === e.currentTarget || (e.target as Element).closest('.upload-content')) {
      handleUploadClick(e);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    console.log('Starting file upload:', file.name, file.size);
    setUploading(true);
    setUploadProgress(0);

    try {
      await onUpload(file, (progress) => {
        console.log('Upload progress:', progress);
        setUploadProgress(progress);
      });
      console.log('Upload completed successfully!');
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
          accept="video/*"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
          multiple={false}
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
            <h3>Upload your golf swing video</h3>
            <p>Tap the blue button below to select a video</p>
            <div className="mobile-upload-btn">
              <button 
                type="button" 
                className="upload-btn-mobile"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Mobile upload button clicked!');
                  handleUploadClick(e);
                }}
                disabled={uploading}
              >
                📹 Choose Video File
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Or drag and drop your video file into this area
            </p>
            <div className="supported-formats">
              <p>Supports: MP4, AVI, MOV, MKV, WebM, OGG, 3GP, FLV, WMV</p>
              <p>Maximum file size: 500MB</p>
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
              ⚡ Upload in progress - please wait...
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
              <p>Optimized for golf swing videos</p>
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