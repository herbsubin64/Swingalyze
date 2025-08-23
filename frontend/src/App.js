import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VideoUploadTest = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setUploadedFile(file);
  };

  const analyzeSwing = async () => {
    if (!uploadedFile) return;
    
    setIsAnalyzing(true);
    try {
      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockAnalysis = {
        filename: uploadedFile.name,
        clubSpeed: Math.floor(Math.random() * 30) + 85,
        ballSpeed: Math.floor(Math.random() * 40) + 120,
        accuracy: Math.floor(Math.random() * 25) + 70,
        recommendations: [
          "Good swing tempo detected",
          "Hip rotation timing is optimal", 
          "Keep head position steady during impact"
        ]
      };
      
      setAnalysisResult(mockAnalysis);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '8px' }}>🏌️ SwingAlyze Pro</h1>
        <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>AI-Powered Golf Swing Video Analysis</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Upload Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '24px', 
          border: '2px dashed #10b981',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>📤 Upload Swing Video</h3>
          <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
            Upload your golf swing video for analysis
          </p>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '120px',
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: '#f9fafb',
              transition: 'all 0.2s'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎥</div>
                <p style={{ marginBottom: '4px', fontSize: '14px' }}>
                  <strong>Click to upload</strong> or drag and drop
                </p>
                <p style={{ fontSize: '12px', color: '#6b7280' }}>MP4, MOV, AVI (MAX. 100MB)</p>
              </div>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {uploadedFile && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f0fdf4', 
              borderRadius: '8px', 
              marginBottom: '16px' 
            }}>
              <p style={{ fontSize: '14px', color: '#15803d' }}>
                <strong>File selected:</strong> {uploadedFile.name}
              </p>
              <p style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>
                Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <button
            onClick={analyzeSwing}
            disabled={!uploadedFile || isAnalyzing}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: uploadedFile && !isAnalyzing ? '#16a34a' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: uploadedFile && !isAnalyzing ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isAnalyzing ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Analyzing Video...
              </>
            ) : (
              <>
                📊 Analyze Swing Video
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>🎯 Analysis Results</h3>
          
          {analysisResult ? (
            <div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '12px', 
                  backgroundColor: '#eff6ff', 
                  borderRadius: '8px' 
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb' }}>
                    {analysisResult.clubSpeed}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Club Speed (mph)</div>
                </div>
                
                <div style={{ 
                  textAlign: 'center', 
                  padding: '12px', 
                  backgroundColor: '#f0fdf4', 
                  borderRadius: '8px' 
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                    {analysisResult.ballSpeed}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Ball Speed (mph)</div>
                </div>
                
                <div style={{ 
                  textAlign: 'center', 
                  padding: '12px', 
                  backgroundColor: '#faf5ff', 
                  borderRadius: '8px',
                  gridColumn: 'span 2'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9333ea' }}>
                    {analysisResult.accuracy}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Accuracy Score</div>
                </div>
              </div>

              <div>
                <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>🤖 AI Recommendations:</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {analysisResult.recommendations.map((rec, index) => (
                    <li key={index} style={{ 
                      fontSize: '14px', 
                      color: '#4b5563', 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ color: '#10b981' }}>•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
                  <strong>Video processed:</strong> {analysisResult.filename}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
              <p>Upload and analyze a swing video to see AI-powered results</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                Real-time analysis with professional metrics
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '16px', fontWeight: '600' }}>📋 How to Use SwingAlyze Pro</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📱</div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>1. Record</h4>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Record your golf swing with your phone or camera from the side view
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>☁️</div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>2. Upload</h4>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Upload your video file using the drag-and-drop area above
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>3. Analyze</h4>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              Get AI-powered analysis with metrics and personalized recommendations
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VideoUploadTest />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;