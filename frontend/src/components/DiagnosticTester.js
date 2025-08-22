import React, { useState, useRef } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
console.log('Backend URL:', BACKEND_URL);

export default function DiagnosticTester() {
  const [logs, setLogs] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef();

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    setLogs(prev => [...prev, logEntry]);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  };

  const testBackendConnection = async () => {
    addLog('Testing backend connection...', 'info');
    try {
      const response = await fetch(`${BACKEND_URL}/api/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      addLog(`Backend response status: ${response.status}`, response.ok ? 'success' : 'error');
      
      if (response.ok) {
        const data = await response.json();
        addLog(`Backend message: ${data.message}`, 'success');
      } else {
        addLog(`Backend error: ${response.statusText}`, 'error');
      }
    } catch (error) {
      addLog(`Network error: ${error.message}`, 'error');
    }
  };

  const testFileUpload = async (file) => {
    addLog(`Starting upload test with file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`, 'info');
    setIsUploading(true);
    setResult(null);

    try {
      // Test 1: Basic file validation
      addLog('Step 1: File validation...', 'info');
      if (!file) {
        throw new Error('No file selected');
      }
      
      const validTypes = ['video/mp4', 'video/mov', 'video/quicktime', 'video/avi', 'video/webm'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm)$/i)) {
        throw new Error(`Invalid file type: ${file.type}. File name: ${file.name}`);
      }
      addLog(`✓ File type valid: ${file.type}`, 'success');

      if (file.size > 200 * 1024 * 1024) {
        throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 200MB)`);
      }
      addLog(`✓ File size valid: ${(file.size / 1024 / 1024).toFixed(2)}MB`, 'success');

      // Test 2: Prepare form data
      addLog('Step 2: Preparing form data...', 'info');
      const formData = new FormData();
      formData.append('video', file);
      formData.append('user_id', 'diagnostic_test_' + Date.now());
      formData.append('swing_type', 'full_swing');
      formData.append('club_type', 'driver');
      addLog('✓ Form data prepared', 'success');

      // Test 3: Send request with detailed monitoring
      addLog('Step 3: Sending request to /api/quick-analyze...', 'info');
      const startTime = Date.now();
      
      const response = await fetch(`${BACKEND_URL}/api/quick-analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary for FormData
        },
        // Add timeout
        signal: AbortSignal.timeout(30000)
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      addLog(`Response received in ${responseTime}ms with status: ${response.status}`, response.ok ? 'success' : 'error');

      // Test 4: Parse response
      addLog('Step 4: Parsing response...', 'info');
      const responseText = await response.text();
      addLog(`Raw response length: ${responseText.length} characters`, 'info');
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        addLog('✓ JSON parsing successful', 'success');
      } catch (parseError) {
        addLog(`JSON parse error: ${parseError.message}`, 'error');
        addLog(`First 200 chars of response: ${responseText.substring(0, 200)}`, 'error');
        throw new Error('Invalid JSON response from server');
      }

      if (!response.ok) {
        throw new Error(`Server error ${response.status}: ${responseData.detail || responseData.message || 'Unknown error'}`);
      }

      // Test 5: Validate response structure
      addLog('Step 5: Validating response structure...', 'info');
      const requiredFields = ['analysis_id', 'metrics', 'processing_time'];
      const missingFields = requiredFields.filter(field => !(field in responseData));
      
      if (missingFields.length > 0) {
        addLog(`Missing required fields: ${missingFields.join(', ')}`, 'error');
      } else {
        addLog('✓ All required fields present', 'success');
      }

      addLog(`Analysis ID: ${responseData.analysis_id}`, 'info');
      addLog(`Processing time: ${responseData.processing_time}`, 'info');
      addLog(`Confidence: ${responseData.confidence || 'N/A'}`, 'info');

      if (responseData.metrics) {
        addLog('Metrics received:', 'info');
        Object.entries(responseData.metrics).forEach(([key, value]) => {
          addLog(`  ${key}: ${value}`, 'info');
        });
      }

      setResult(responseData);
      addLog('🎉 Upload and analysis completed successfully!', 'success');

    } catch (error) {
      addLog(`❌ Upload failed: ${error.message}`, 'error');
      if (error.name === 'AbortError') {
        addLog('Request timed out after 30 seconds', 'error');
      }
      setResult({ error: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      testFileUpload(file);
    }
  };

  const createTestVideo = () => {
    // Create a minimal test video file
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    // Draw a simple pattern
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.fillText('Test Video', 200, 240);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'test-video.mp4', { type: 'video/mp4' });
      testFileUpload(file);
    }, 'video/mp4');
  };

  const clearLogs = () => {
    setLogs([]);
    setResult(null);
  };

  return (
    <div style={{ 
      maxWidth: '1000px', 
      margin: '20px auto', 
      padding: '20px', 
      fontFamily: 'monospace',
      background: '#f8f9fa',
      borderRadius: '8px'
    }}>
      <h2>SwingAlyze Diagnostic Tester</h2>
      <p>This tool helps debug upload and analysis issues by testing each step individually.</p>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={testBackendConnection}
          style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Backend Connection
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="video/*"
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {isUploading ? 'Uploading...' : 'Test File Upload'}
        </button>
        
        <button
          onClick={createTestVideo}
          disabled={isUploading}
          style={{ padding: '8px 16px', background: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}
        >
          Create Test Video
        </button>
        
        <button
          onClick={clearLogs}
          style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Clear Logs
        </button>
      </div>

      {/* Logs Display */}
      <div style={{ 
        background: '#1a1a1a', 
        color: '#fff', 
        padding: '15px', 
        borderRadius: '4px', 
        height: '400px', 
        overflow: 'auto',
        fontSize: '12px',
        lineHeight: '1.4'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Debug Logs:</div>
        {logs.length === 0 && <div style={{ color: '#888' }}>Click a button above to start testing...</div>}
        {logs.map((log, index) => (
          <div key={index} style={{ 
            color: log.type === 'error' ? '#ff4444' : 
                  log.type === 'success' ? '#44ff44' : 
                  '#fff',
            marginBottom: '2px'
          }}>
            <span style={{ color: '#888' }}>[{log.timestamp}]</span> {log.message}
          </div>
        ))}
        
        {isUploading && (
          <div style={{ color: '#ffaa00', marginTop: '10px' }}>
            🔄 Processing... (this may take up to 30 seconds)
          </div>
        )}
      </div>

      {/* Result Display */}
      {result && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#fff', borderRadius: '4px' }}>
          <h3>Result:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}