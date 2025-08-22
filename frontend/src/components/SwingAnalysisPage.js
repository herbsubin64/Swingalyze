import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import VideoUploader from './VideoUploader';
import SwingAnalysisResults from './SwingAnalysisResults';
import VideoLibrary from './VideoLibrary';
import RealTimeAnalysis from './RealTimeAnalysis';
import '../styles/SwingAnalysis.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configure axios with extended timeout and retry logic
const axiosConfig = {
  timeout: 600000, // 10 minutes timeout (increased from 5)
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
};

const SwingAnalysisPage = () => {
  const [uploads, setUploads] = useState([]);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');

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

  // Handle file upload
  const handleUpload = async (file, onProgress) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCurrentAnalysis(null);

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

      // Check file size (minimum 1KB for valid videos)
      if (file.size < 1024) {
        throw new Error('File is too small to be a valid video. Please upload a proper golf swing video file.');
      }

      // Check reasonable maximum size (e.g., 500MB)
      if (file.size > 500 * 1024 * 1024) {
        throw new Error('Video file is too large. Please upload a video smaller than 500MB.');
      }

      // Step 1: Upload video
      const formData = new FormData();
      formData.append('file', file);

      const uploadConfig = {
        ...axiosConfig,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentage = Math.round(
            (progressEvent.loaded * 50) / progressEvent.total // 50% for upload
          );
          onProgress(percentage);
        },
      };

      const uploadResponse = await axios.post(`${API}/upload`, formData, uploadConfig);
      const videoId = uploadResponse.data.id;
      
      onProgress(60); // Upload complete
      setSuccess(`Video uploaded successfully! Starting AI analysis...`);

      // Step 2: Analyze the uploaded video with retry logic
      let analysisAttempts = 0;
      const maxRetries = 3;
      
      while (analysisAttempts < maxRetries) {
        try {
          analysisAttempts++;
          setSuccess(`Video uploaded successfully! AI analysis attempt ${analysisAttempts}/${maxRetries}...`);
          
          const analysisResponse = await axios.post(`${API}/analyze/${videoId}`, {}, {
            ...axiosConfig,
            timeout: 600000 // 10 minutes for analysis
          });
          
          onProgress(100); // Analysis complete
          setCurrentAnalysis(analysisResponse.data);
          setSuccess(`Swing analysis complete with ghost skeleton overlay!`);
          await fetchUploads(); // Refresh the uploads list
          return uploadResponse.data;
          
        } catch (analysisError) {
          console.error(`Analysis attempt ${analysisAttempts} failed:`, analysisError);
          
          if (analysisAttempts >= maxRetries) {
            // Final attempt failed, but upload succeeded
            setSuccess(`Video uploaded successfully! Analysis is processing in background. Check Video Library tab.`);
            await fetchUploads(); // Refresh to show the uploaded video
            return uploadResponse.data;
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

    } catch (error) {
      console.error('Upload/Analysis error:', error);
      
      // Handle specific error types
      let errorMessage = 'Upload or analysis failed. Please try again.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Analysis timed out. The file may be too large or complex. Please try with a shorter video.';
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

  // Handle video analysis
  const handleAnalyze = async (videoId) => {
    setIsLoading(true);
    setError(null);
    setCurrentAnalysis(null);

    try {
      setSuccess('Starting AI swing analysis with ghost skeleton...');
      
      const response = await axios.post(`${API}/analyze/${videoId}`, {}, {
        ...axiosConfig,
        timeout: 600000 // 10 minutes for analysis
      });
      
      setCurrentAnalysis(response.data);
      setSuccess('Swing analysis complete with ghost skeleton overlay!');
    } catch (error) {
      console.error('Analysis error:', error);
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        setError('Analysis is taking longer than expected. The video is still being processed in the background. Please check back in a few minutes or try a shorter video.');
      } else {
        setError('Failed to analyze swing. Please try again with a clearer video or check your internet connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (videoId) => {
    try {
      await axios.delete(`${API}/uploads/${videoId}`, axiosConfig);
      setSuccess('Video and analysis deleted successfully!');
      await fetchUploads();
      
      // Clear current analysis if it's for the deleted video
      if (currentAnalysis && currentAnalysis.video_id === videoId) {
        setCurrentAnalysis(null);
      }
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <div className="upload-section">
            <VideoUploader 
              onUpload={handleUpload}
              isLoading={isLoading}
            />
          </div>
        );
      case 'library':
        return (
          <VideoLibrary 
            uploads={uploads}
            onAnalyze={handleAnalyze}
            onDelete={handleDelete}
            onRefresh={fetchUploads}
            isLoading={isLoading}
          />
        );
      case 'realtime':
        return (
          <RealTimeAnalysis />
        );
      case 'analysis':
        return (
          <SwingAnalysisResults 
            analysis={currentAnalysis}
            onClose={() => setCurrentAnalysis(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="swing-analysis-page">
      <div className="container">
        <header className="page-header">
          <div className="header-content">
            <div className="logo-section">
              <div className="golf-icon">⛳</div>
              <h1>SwingAlyze</h1>
              <p>AI-Powered Golf Swing Analysis with <strong>Ghost Skeleton Superimposition</strong></p>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="tab-navigation">
          <button 
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <span className="tab-icon">📤</span>
            Upload & Analyze
          </button>
          <button 
            className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <span className="tab-icon">📚</span>
            Video Library
          </button>
          <button 
            className={`tab-btn ${activeTab === 'realtime' ? 'active' : ''}`}
            onClick={() => setActiveTab('realtime')}
          >
            <span className="tab-icon">📹</span>
            Real-Time Analysis
          </button>
          {currentAnalysis && (
            <button 
              className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              <span className="tab-icon">📊</span>
              Analysis Results
            </button>
          )}
        </nav>

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className="message-container">
            {error && (
              <div className="error-message">
                <span className="error-icon">❌</span>
                <div className="error-content">
                  <strong>Error:</strong> {error}
                  <div className="error-details">
                    <p><strong>Troubleshooting:</strong></p>
                    <ol>
                      <li>Check your internet connection</li>
                      <li>Try a shorter video file (under 2 minutes)</li>
                      <li>Ensure good lighting in your video</li>
                      <li>Make sure golfer is clearly visible</li>
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

        {/* Tab Content */}
        <div className="tab-content">
          {renderTabContent()}
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h2>SwingAlyze Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">👻</div>
              <h3>Ghost Skeleton Overlay</h3>
              <p>Advanced pose detection creates a skeleton overlay showing your body mechanics throughout the swing</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📐</div>
              <h3>Biomechanical Analysis</h3>
              <p>Precise measurement of joint angles, spine posture, and swing plane for technical improvement</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏱️</div>
              <h3>Swing Phase Detection</h3>
              <p>Automatic segmentation into address, backswing, top, downswing, and follow-through phases</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Personalized Recommendations</h3>
              <p>AI-powered coaching tips based on your unique swing characteristics and improvements needed</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📹</div>
              <h3>Real-Time Analysis</h3>
              <p>Live feedback during practice sessions with instant ghost skeleton visualization</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Progress Tracking</h3>
              <p>Compare swings over time and track improvement in key biomechanical metrics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwingAnalysisPage;