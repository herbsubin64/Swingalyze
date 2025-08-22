import React, { useState, useCallback } from 'react';
import axios from 'axios';
import VideoUploader from './components/VideoUploader';
import './SwingAnalysis.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://swing-debug.preview.emergentagent.com';
const API = `${BACKEND_URL}/api`;

interface Upload {
  id: string;
  original_filename: string;
  file_size: number;
  upload_timestamp: string;
}

export default function App() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Configure axios with extended timeout
  const axiosConfig = {
    timeout: 300000, // 5 minutes
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  };

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

  // Handle file upload with proper validation
  const handleUpload = async (file: File, onProgress: (progress: number) => void) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Basic validation
      if (!file) {
        throw new Error('No file selected');
      }

      // Check file size
      if (file.size < 1024) {
        throw new Error('File is too small to be a valid video. Please upload a proper golf swing video.');
      }

      if (file.size > 500 * 1024 * 1024) {
        throw new Error('Video file is too large. Please upload a video smaller than 500MB.');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload with progress
      const uploadConfig = {
        ...axiosConfig,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: any) => {
          const percentage = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentage);
        },
      };

      const uploadResponse = await axios.post(`${API}/upload`, formData, uploadConfig);
      
      setSuccess(`Successfully uploaded ${file.name}! Video is ready for analysis.`);
      await fetchUploads();
      
      return uploadResponse.data;

    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Upload failed. Please try again.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.detail || 'Invalid file format or corrupted file.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle analyze
  const handleAnalyze = async (videoId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API}/analyze/${videoId}`, {}, axiosConfig);
      setSuccess('Analysis complete! Your swing has been analyzed with AI ghost skeleton overlay.');
      await fetchUploads();
    } catch (error) {
      console.error('Analysis error:', error);
      setError('Analysis is processing. Please check back in a few minutes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (videoId: string) => {
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
    <div className="swing-analysis-page">
      <div className="container">
        <header className="page-header">
          <div className="header-content">
            <div className="logo-section">
              <div className="golf-icon">⛳</div>
              <h1>SwingAlyze</h1>
              <p>AI-Powered Golf Swing Analysis with <strong>Ghost Skeleton</strong></p>
            </div>
          </div>
        </header>

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className="message-container">
            {error && (
              <div className="error-message">
                <span className="error-icon">❌</span>
                <div className="error-content">
                  <strong>Error:</strong> {error}
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

        {/* Video Library */}
        <div className="uploads-section">
          <h2>📚 Video Library ({uploads.length})</h2>
          
          {uploads.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⛳</div>
              <h3>No golf swing videos yet</h3>
              <p>Upload your first golf swing video to get started with AI analysis</p>
            </div>
          ) : (
            <div className="video-grid">
              {uploads.map((upload) => (
                <div key={upload.id} className="video-card">
                  <div className="video-info">
                    <h3 className="video-title">{upload.original_filename}</h3>
                    <div className="video-meta">
                      <p><strong>Size:</strong> {Math.round(upload.file_size / 1024)} KB</p>
                      <p><strong>Uploaded:</strong> {new Date(upload.upload_timestamp).toLocaleString()}</p>
                    </div>
                    <div className="video-actions">
                      <button 
                        onClick={() => handleAnalyze(upload.id)}
                        className="action-btn analyze-btn"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Analyzing...' : '🤖 Analyze with AI'}
                      </button>
                      <button 
                        onClick={() => handleDelete(upload.id)}
                        className="action-btn delete-btn"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="features-section">
          <h2>SwingAlyze Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👻</div>
              <h3>Ghost Skeleton</h3>
              <p>AI pose detection creates skeleton overlay showing your body mechanics</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📐</div>
              <h3>Swing Analysis</h3>
              <p>Detailed biomechanical analysis of your golf swing technique</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Recommendations</h3>
              <p>Personalized coaching tips to improve your swing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}