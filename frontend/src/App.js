import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import SwingalyzeDebug from "./components/SwingalyzeDebug";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Home/Landing Page Component
const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">SwingAlyze</h1>
              <span className="ml-2 text-sm text-green-400">AI-Powered</span>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => navigate('/analyze')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Start Analysis
              </button>
              <button 
                onClick={() => navigate('/debug')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Debug Studio
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Perfect Your
            <span className="text-green-400"> Golf Swing</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Advanced AI-powered swing analysis that provides professional-level feedback, 
            detailed metrics, and personalized recommendations to improve your game.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/analyze')}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg"
            >
              Analyze Your Swing
            </button>
            <button 
              onClick={() => navigate('/debug')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg"
            >
              Debug Studio
            </button>
            <button 
              onClick={() => navigate('/progress')}
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors border border-white/20"
            >
              View Progress
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Video Analysis</h3>
            <p className="text-gray-300">Upload swing videos for comprehensive AI-powered analysis of your technique.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Detailed Metrics</h3>
            <p className="text-gray-300">Get scored feedback on stance, backswing, impact, and follow-through.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Debug Studio</h3>
            <p className="text-gray-300">Professional analysis interface with advanced visualizations and controls.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Swing Analysis Component
const SwingAnalysis = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [userId, setUserId] = useState('user_' + Math.random().toString(36).substr(2, 9));
  const [swingType, setSwingType] = useState('full_swing');
  const [clubType, setClubType] = useState('driver');
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
    } else {
      alert('Please select a video file');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
    } else {
      alert('Please drop a video file');
    }
  };

  const analyzeSwing = async () => {
    if (!selectedFile) {
      alert('Please select a video file first');
      return;
    }

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('user_id', userId);
      formData.append('swing_type', swingType);
      formData.append('club_type', clubType);
      formData.append('notes', notes);

      const response = await axios.post(`${API}/analyze-swing`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for AI analysis
      });

      setAnalysis(response.data);
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again or check if you have provided the Emergent LLM key.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (analysis) {
    return <AnalysisResults analysis={analysis} onBack={() => setAnalysis(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button onClick={() => navigate('/')} className="text-2xl font-bold text-white hover:text-green-400 transition-colors">
                SwingAlyze
              </button>
              <span className="ml-2 text-sm text-green-400">AI-Powered</span>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => navigate('/progress')}
                className="text-white hover:text-green-400 transition-colors"
              >
                Progress
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Analyze Your Swing</h1>

        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
          {/* File Upload Area */}
          <div 
            className="border-2 border-dashed border-green-400 rounded-lg p-12 text-center mb-8 hover:border-green-300 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div>
                <svg className="w-16 h-16 text-green-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-white text-lg font-semibold mb-2">{selectedFile.name}</p>
                <p className="text-gray-300">Video ready for analysis</p>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="mt-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-white text-lg font-semibold mb-2">Drop your swing video here</p>
                <p className="text-gray-300 mb-4">or click to browse files</p>
                <input 
                  type="file" 
                  accept="video/*" 
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label 
                  htmlFor="video-upload"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors"
                >
                  Select Video
                </label>
              </div>
            )}
          </div>

          {/* Analysis Options */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-white font-semibold mb-2">Swing Type</label>
              <select 
                value={swingType} 
                onChange={(e) => setSwingType(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="full_swing">Full Swing</option>
                <option value="chip">Chip Shot</option>
                <option value="putt">Putt</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">Club Type</label>
              <select 
                value={clubType} 
                onChange={(e) => setClubType(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                <option value="driver">Driver</option>
                <option value="iron">Iron</option>
                <option value="wedge">Wedge</option>
                <option value="putter">Putter</option>
              </select>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-white font-semibold mb-2">Additional Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific areas you'd like analyzed or concerns about your swing..."
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 h-24 resize-none"
            />
          </div>

          {/* Analyze Button */}
          <button 
            onClick={analyzeSwing}
            disabled={!selectedFile || analyzing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg text-lg font-semibold transition-colors"
          >
            {analyzing ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Swing... (This may take up to 2 minutes)
              </div>
            ) : 'Analyze Swing'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Analysis Results Component
const AnalysisResults = ({ analysis, onBack }) => {
  const MetricCard = ({ title, score, analysis: metricAnalysis }) => (
    <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="text-right">
          <span className="text-2xl font-bold text-green-400">{score}/100</span>
        </div>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
        <div 
          className="bg-gradient-to-r from-green-600 to-green-400 h-3 rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <p className="text-gray-300 text-sm">{metricAnalysis}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">SwingAlyze</h1>
              <span className="ml-2 text-sm text-green-400">AI-Powered</span>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={onBack}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Analyze Another
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Swing Analysis Results</h1>
          <div className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-full">
            <span className="text-2xl font-bold mr-2">{analysis.metrics.overall_score}/100</span>
            <span>Overall Score</span>
          </div>
        </div>

        {/* Overall Assessment */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Overall Assessment</h2>
          <p className="text-gray-300 text-lg leading-relaxed">{analysis.overall_assessment}</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard title="Stance & Setup" score={analysis.metrics.stance_score} analysis={analysis.stance_analysis} />
          <MetricCard title="Backswing" score={analysis.metrics.backswing_score} analysis={analysis.backswing_analysis} />
          <MetricCard title="Downswing" score={analysis.metrics.downswing_score} analysis={analysis.downswing_analysis} />
          <MetricCard title="Impact" score={analysis.metrics.impact_score} analysis={analysis.impact_analysis} />
          <MetricCard title="Follow Through" score={analysis.metrics.follow_through_score} analysis={analysis.follow_through_analysis} />
          <MetricCard title="Balance" score={analysis.metrics.balance_score} analysis={analysis.balance_analysis} />
        </div>

        {/* Detailed Feedback */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Strengths */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-green-400 mb-6">Key Strengths</h2>
            <ul className="space-y-3">
              {analysis.key_strengths.map((strength, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-400 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-300">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-yellow-400 mb-6">Areas for Improvement</h2>
            <ul className="space-y-3">
              {analysis.areas_for_improvement.map((area, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-400 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-300">{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommendations and Drills */}
        <div className="grid lg:grid-cols-2 gap-8 mt-8">
          {/* Specific Recommendations */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-blue-400 mb-6">Recommendations</h2>
            <ul className="space-y-3">
              {analysis.specific_recommendations.map((rec, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-blue-400 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Practice Drills */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold text-purple-400 mb-6">Practice Drills</h2>
            <ul className="space-y-3">
              {analysis.drill_suggestions.map((drill, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-purple-400 mt-1 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-300">{drill}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Progress Tracking Component
const ProgressTracking = () => {
  const [userId] = useState('user_' + Math.random().toString(36).substr(2, 9));
  const [analyses, setAnalyses] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const [analysesRes, progressRes] = await Promise.all([
        axios.get(`${API}/user-analyses/${userId}`),
        axios.get(`${API}/progress/${userId}`)
      ]);
      
      setAnalyses(analysesRes.data);
      setProgress(progressRes.data);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your progress...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      {/* Navigation */}
      <nav className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button onClick={() => navigate('/')} className="text-2xl font-bold text-white hover:text-green-400 transition-colors">
                SwingAlyze
              </button>
              <span className="ml-2 text-sm text-green-400">AI-Powered</span>
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => navigate('/analyze')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                New Analysis
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-white text-center mb-8">Your Progress</h1>

        {analyses.length === 0 ? (
          <div className="text-center">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-12 border border-white/10">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 className="text-2xl font-bold text-white mb-4">No Analysis Data Yet</h2>
              <p className="text-gray-300 mb-6">Upload your first swing video to start tracking your progress!</p>
              <button 
                onClick={() => navigate('/analyze')}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
              >
                Analyze Your First Swing
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Progress Overview */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10 mb-8">
                <h2 className="text-2xl font-bold text-white mb-6">Progress Overview</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-400 mb-2">{progress?.total_analyses || 0}</div>
                    <div className="text-gray-300">Total Analyses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400 mb-2">{progress?.latest_score?.toFixed(1) || 0}</div>
                    <div className="text-gray-300">Latest Score</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold mb-2 ${progress?.improvement >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {progress?.improvement >= 0 ? '+' : ''}{progress?.improvement?.toFixed(1) || 0}
                    </div>
                    <div className="text-gray-300">Improvement</div>
                  </div>
                </div>
              </div>

              {/* Recent Analyses */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6">Recent Analyses</h2>
                <div className="space-y-4">
                  {analyses.slice(0, 5).map((analysis, index) => (
                    <div key={analysis.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-white font-semibold">
                            Analysis #{analyses.length - index}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {new Date(analysis.analysis_timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-400">
                            {analysis.metrics.overall_score}/100
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div>
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6">Score Breakdown</h2>
                {progress?.area_progress && Object.entries(progress.area_progress).map(([key, data]) => (
                  <div key={key} className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium capitalize">
                        {key.replace('_score', '').replace('_', ' ')}
                      </span>
                      <span className="text-green-400 font-bold">{data.current}/100</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${data.current}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      Avg: {data.average.toFixed(1)} | 
                      Change: {data.improvement >= 0 ? '+' : ''}{data.improvement.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<SwingAnalysis />} />
          <Route path="/progress" element={<ProgressTracking />} />
          <Route path="/debug" element={<SwingalyzeDebug />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;