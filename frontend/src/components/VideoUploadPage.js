import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import VideoUploader from './VideoUploader';
import VideoList from './VideoList';
import '../styles/VideoUpload.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios with extended timeout and retry logic
const axiosConfig = {
  timeout: 300000, // 5 minutes timeout
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
};

const VideoUploadPage = () => {
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch uploads from backend
  const fetchUploads = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/uploads`, axiosConfig);
      setUploads(response.data);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      setError('Failed to fetch uploaded videos');
    }
  }, []);

  // Handle file upload with bulletproof error handling
  const handleUpload = async (file, onProgress) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate file type on frontend first
      const validTypes = [
        'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo',
        'video/webm', 'video/ogg', 'video/x-matroska', 'video/3gpp',
        'video/x-flv', 'video/x-ms-wmv'
      ];
      
      const isValidType = validTypes.includes(file.type) || 
        /\.(mp4|avi|mov|mkv|webm|ogg|3gp|flv|wmv)$/i.test(file.name);
      
      if (!isValidType) {
        throw new Error('Unsupported video format. Please upload MP4, AVI, MOV, MKV, WebM, OGG, 3GP, FLV, or WMV files.');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Configure request with extended timeout and progress tracking
      const config = {
        ...axiosConfig,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentage);
        },
        // Add retry logic
        retry: 3,
        retryDelay: (retryCount) => {
          return Math.pow(2, retryCount) * 1000; // Exponential backoff
        },
      };

      // Upload with axios-retry wrapper
      const response = await uploadWithRetry(`${API}/upload`, formData, config);
      
      setSuccess(`Successfully uploaded ${file.name}!`);
      await fetchUploads(); // Refresh the uploads list
      return response.data;

    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle specific error types
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Upload timed out. The file may be too large or your connection is slow. Please try with a smaller file or check your internet connection.';
      } else if (error.response?.status === 413) {
        errorMessage = 'File is too large. Please try a smaller video file.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.detail || 'Invalid file format or corrupted file.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry wrapper for axios requests
  const uploadWithRetry = async (url, data, config, retryCount = 0) => {
    try {
      return await axios.post(url, data, config);
    } catch (error) {
      const maxRetries = config.retry || 3;
      
      if (retryCount < maxRetries && 
          (error.code === 'ECONNABORTED' || 
           error.response?.status >= 500 ||
           error.code === 'NETWORK_ERROR')) {
        
        const delay = config.retryDelay ? config.retryDelay(retryCount) : 1000;
        console.log(`Retry attempt ${retryCount + 1} after ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadWithRetry(url, data, config, retryCount + 1);
      }
      
      throw error;
    }
  };

  // Handle delete
  const handleDelete = async (videoId) => {
    try {
      await axios.delete(`${API}/uploads/${videoId}`, axiosConfig);
      setSuccess('Video deleted successfully!');
      await fetchUploads();
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete video');
    }
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  React.useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  return (
    <div className="video-upload-page">
      <div className="container">
        <header className="page-header">
          <div className="header-content">
            <div className="shield-icon">🛡️</div>
            <h1>Bulletproof Video Upload</h1>
            <p>Simple, direct upload that <strong>CANNOT</strong> get stuck in spinning state</p>
          </div>
        </header>

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className="message-container">
            {error && (
              <div className="error-message">
                <span className="error-icon">❌</span>
                <div className="error-content">
                  <strong>Upload failed:</strong> {error}
                  <div className="error-details">
                    <p><strong>Technical details:</strong> Fetch is aborted</p>
                    <p><strong>Try:</strong></p>
                    <ol>
                      <li>Check your internet connection</li>
                      <li>Try a smaller video file</li>
                      <li>Convert to MP4 format</li>
                      <li>Check browser console for more details</li>
                    </ol>
                  </div>
                </div>
                <button className="close-btn" onClick={clearMessages}>Close</button>
              </div>
            )}
            
            {success && (
              <div className="success-message">
                <span className="success-icon">✅</span>
                <span>{success}</span>
                <button className="close-btn" onClick={clearMessages}>Close</button>
              </div>
            )}
          </div>
        )}

        {/* Upload Section */}
        <div className="upload-section">
          <VideoUploader 
            onUpload={handleUpload}
            isLoading={isLoading}
          />
        </div>

        {/* Uploaded Videos List */}
        <div className="uploads-section">
          <VideoList 
            uploads={uploads}
            onDelete={handleDelete}
            onRefresh={fetchUploads}
          />
        </div>
      </div>
    </div>
  );
};

export default VideoUploadPage;