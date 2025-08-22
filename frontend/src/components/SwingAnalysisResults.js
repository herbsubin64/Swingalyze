import React, { useState } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SwingAnalysisResults = ({ analysis, onClose }) => {
  const [activeSection, setActiveSection] = useState('overview');

  if (!analysis) {
    return (
      <div className="analysis-results">
        <div className="no-analysis">
          <div className="no-analysis-icon">📊</div>
          <h3>No Analysis Available</h3>
          <p>Upload and analyze a golf swing video to see detailed results here.</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="overview-section">
      <div className="analysis-summary">
        <h3>Swing Analysis Summary</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <h4>Video Info</h4>
            <p><strong>Duration:</strong> {analysis.video_info?.duration?.toFixed(1)}s</p>
            <p><strong>FPS:</strong> {analysis.video_info?.fps?.toFixed(1)}</p>
            <p><strong>Resolution:</strong> {analysis.video_info?.width}×{analysis.video_info?.height}</p>
          </div>
          
          <div className="summary-card">
            <h4>Ghost Skeleton</h4>
            <p><strong>Pose Detection Rate:</strong> {analysis.ghost_skeleton_data?.pose_detection_rate?.toFixed(1)}%</p>
            <p><strong>Frames Analyzed:</strong> {analysis.ghost_skeleton_data?.total_frames}</p>
            <p><strong>Angles Tracked:</strong> {analysis.ghost_skeleton_data?.key_angles_tracked?.length || 0}</p>
          </div>
          
          <div className="summary-card">
            <h4>Swing Phases</h4>
            <p><strong>Phases Detected:</strong> {analysis.swing_phases?.length || 0}</p>
            <p><strong>Quality Score:</strong> {calculateOverallQuality(analysis)}/10</p>
          </div>
        </div>
      </div>

      {/* Ghost Skeleton Video */}
      {analysis.overlay_video && (
        <div className="ghost-skeleton-section">
          <h3>🦴 Ghost Skeleton Analysis</h3>
          <div className="video-container">
            <video 
              width="100%" 
              height="400" 
              controls 
              preload="metadata"
              className="ghost-skeleton-video"
            >
              <source src={`${BACKEND_URL}${analysis.overlay_video}`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <p className="video-description">
            This video shows your swing with the AI-generated ghost skeleton overlay, 
            highlighting your body mechanics and joint movements throughout the swing.
          </p>
        </div>
      )}
    </div>
  );

  const renderBiomechanics = () => (
    <div className="biomechanics-section">
      <h3>Biomechanical Analysis</h3>
      
      {/* Overall Metrics */}
      <div className="metrics-group">
        <h4>Overall Swing Metrics</h4>
        <div className="metrics-grid">
          {analysis.biomechanical_data?.overall_metrics && Object.entries(analysis.biomechanical_data.overall_metrics).map(([key, value]) => (
            <div key={key} className="metric-card">
              <span className="metric-label">{formatMetricName(key)}</span>
              <span className="metric-value">{typeof value === 'number' ? value.toFixed(1) : value}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ghost Skeleton Insights */}
      {analysis.biomechanical_data?.ghost_skeleton_insights && (
        <div className="metrics-group">
          <h4>👻 Ghost Skeleton Insights</h4>
          <div className="insights-grid">
            <div className="insight-card">
              <h5>Pose Tracking Quality</h5>
              <div className="quality-bar">
                <div 
                  className="quality-fill" 
                  style={{ width: `${(analysis.biomechanical_data.ghost_skeleton_insights.pose_tracking_quality * 100)}%` }}
                ></div>
              </div>
              <span>{(analysis.biomechanical_data.ghost_skeleton_insights.pose_tracking_quality * 100).toFixed(1)}%</span>
            </div>
            
            <div className="insight-card">
              <h5>Swing Tempo</h5>
              <p><strong>Classification:</strong> {analysis.biomechanical_data.ghost_skeleton_insights.swing_tempo?.tempo}</p>
              <p><strong>Duration:</strong> {analysis.biomechanical_data.ghost_skeleton_insights.swing_tempo?.duration?.toFixed(1)}s</p>
            </div>
            
            {analysis.biomechanical_data.ghost_skeleton_insights.body_rotation && (
              <div className="insight-card">
                <h5>Body Rotation</h5>
                <p><strong>Range:</strong> {analysis.biomechanical_data.ghost_skeleton_insights.body_rotation.shoulder_rotation_range?.toFixed(1)}°</p>
                <p><strong>Max Rotation:</strong> {analysis.biomechanical_data.ghost_skeleton_insights.body_rotation.max_rotation?.toFixed(1)}°</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderSwingPhases = () => (
    <div className="swing-phases-section">
      <h3>Swing Phase Analysis</h3>
      <div className="phases-timeline">
        {analysis.swing_phases?.map((phase, index) => (
          <div key={index} className="phase-card">
            <div className="phase-header">
              <h4>{formatPhaseName(phase.phase_name)}</h4>
              <span className="phase-duration">
                Frames {phase.start_frame} - {phase.end_frame}
              </span>
            </div>
            <p className="phase-description">{phase.description}</p>
            
            {phase.key_metrics && Object.keys(phase.key_metrics).length > 0 && (
              <div className="phase-metrics">
                <h5>Key Metrics:</h5>
                <div className="phase-metrics-grid">
                  {Object.entries(phase.key_metrics).map(([key, value]) => (
                    <div key={key} className="phase-metric">
                      <span>{formatMetricName(key)}</span>
                      <span>{typeof value === 'number' ? value.toFixed(1) : value}°</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecommendations = () => (
    <div className="recommendations-section">
      <h3>💡 Personalized Recommendations</h3>
      <div className="recommendations-list">
        {analysis.recommendations?.map((recommendation, index) => (
          <div key={index} className="recommendation-card">
            <div className="recommendation-icon">
              {getRecommendationIcon(recommendation)}
            </div>
            <div className="recommendation-content">
              <p>{recommendation}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="improvement-tips">
        <h4>General Improvement Tips</h4>
        <ul>
          <li>Practice with the ghost skeleton overlay to visualize your body mechanics</li>
          <li>Focus on maintaining consistent posture throughout each swing phase</li>
          <li>Use slow-motion playback to analyze critical moments in your swing</li>
          <li>Compare multiple swings to identify patterns and inconsistencies</li>
          <li>Work with a certified instructor to address specific technical issues</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="analysis-results">
      <div className="results-header">
        <h2>Swing Analysis Results</h2>
        <button className="close-btn" onClick={onClose}>
          <span>✕</span>
        </button>
      </div>

      {/* Section Navigation */}
      <nav className="section-nav">
        <button 
          className={`section-btn ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          Overview & Ghost Skeleton
        </button>
        <button 
          className={`section-btn ${activeSection === 'biomechanics' ? 'active' : ''}`}
          onClick={() => setActiveSection('biomechanics')}
        >
          Biomechanics
        </button>
        <button 
          className={`section-btn ${activeSection === 'phases' ? 'active' : ''}`}
          onClick={() => setActiveSection('phases')}
        >
          Swing Phases
        </button>
        <button 
          className={`section-btn ${activeSection === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveSection('recommendations')}
        >
          Recommendations
        </button>
      </nav>

      {/* Section Content */}
      <div className="section-content">
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'biomechanics' && renderBiomechanics()}
        {activeSection === 'phases' && renderSwingPhases()}
        {activeSection === 'recommendations' && renderRecommendations()}
      </div>
    </div>
  );
};

// Helper functions
const calculateOverallQuality = (analysis) => {
  let score = 5; // Base score
  
  const poseQuality = analysis.biomechanical_data?.ghost_skeleton_insights?.pose_tracking_quality || 0;
  score += poseQuality * 3; // Up to 3 points for pose quality
  
  const phaseCount = analysis.swing_phases?.length || 0;
  if (phaseCount >= 5) score += 2; // 2 points for detecting all phases
  
  return Math.min(10, Math.round(score));
};

const formatMetricName = (key) => {
  return key.replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('Avg', 'Average')
    .replace('Std', 'Consistency');
};

const formatPhaseName = (phaseName) => {
  return phaseName.replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
};

const getRecommendationIcon = (recommendation) => {
  const text = recommendation.toLowerCase();
  if (text.includes('posture') || text.includes('spine')) return '🏌️';
  if (text.includes('tempo') || text.includes('timing')) return '⏱️';
  if (text.includes('arm') || text.includes('extension')) return '💪';
  if (text.includes('consistency') || text.includes('repeatability')) return '🎯';
  if (text.includes('lighting') || text.includes('analysis')) return '💡';
  return '📈';
};

export default SwingAnalysisResults;