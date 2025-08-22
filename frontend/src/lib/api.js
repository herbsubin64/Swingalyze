// SwingAlyze API Integration Layer with Fast Analysis
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export async function uploadFile(file, quickMode = false) {
  // Check file size on client side
  if (file.size > 200 * 1024 * 1024) { // 200MB
    throw new Error('File size must be less than 200MB');
  }
  
  console.log(`Starting upload: ${file.name} (${file.size} bytes) - Quick mode: ${quickMode}`);
  
  const formData = new FormData();
  formData.append('video', file);
  formData.append('user_id', 'user_' + Math.random().toString(36).substr(2, 9));
  formData.append('swing_type', 'full_swing');
  formData.append('club_type', 'driver');
  formData.append('notes', quickMode ? 'Quick analysis mode' : 'Debug studio upload');
  formData.append('quick_mode', quickMode.toString());

  const endpoint = quickMode ? `${API}/quick-analyze` : `${API}/analyze-swing`;
  
  console.log(`Making request to: ${endpoint}`);
  
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(25000) // 25 second timeout
  });

  console.log(`Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    let errorMessage = 'Upload failed';
    try {
      const error = await response.json();
      console.error('Error response:', error);
      errorMessage = error.detail || error.message || errorMessage;
    } catch (e) {
      // If response isn't JSON, use status text
      errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  console.log('Upload result:', result);
  
  // Check if there's an error in the result
  if (result.error) {
    throw new Error(result.message || 'Analysis failed');
  }
  
  if (quickMode) {
    return { 
      url: result.video_path, 
      jobId: result.analysis_id,
      quickResult: result 
    };
  } else {
    return { 
      url: result.video_path, 
      jobId: result.analysis_id || result.id  // Handle both possible field names
    };
  }
}

export async function quickAnalyzeFromUrl(videoUrl) {
  // For demo/quick analysis from URL
  return {
    jobId: 'quick_' + Math.random().toString(36).substr(2, 9),
    quickResult: {
      analysis_id: 'demo_quick',
      processing_time: '1.2 seconds',
      metrics: {
        club_path_deg: 1.8,
        face_to_path_deg: -0.9,
        attack_angle_deg: -3.2,
        tempo_ratio: 3.1,
        shoulder_rotation_deg: 48,
        hip_rotation_deg: 33,
        swing_speed_mph: 94.2
      },
      swing_path: [
        { x: 0.25, y: 0.75 },
        { x: 0.4, y: 0.55 },
        { x: 0.55, y: 0.35 },
        { x: 0.7, y: 0.3 },
        { x: 0.8, y: 0.25 }
      ],
      key_positions: [
        { x: 0.25, y: 0.75, label: 'Address', color: '#3b82f6' },
        { x: 0.55, y: 0.35, label: 'Impact', color: '#ef4444' },
        { x: 0.8, y: 0.25, label: 'Follow Through', color: '#10b981' }
      ],
      recommendations: [
        'Great swing plane - maintain this path',
        'Work on consistent tempo',
        'Focus on balance at finish'
      ],
      confidence: 0.92
    }
  };
}

export async function analyzeFromUrl(url, sport = "golf") {
  // For demo purposes, return a mock job ID
  return { jobId: 'demo_' + Math.random().toString(36).substr(2, 9) };
}

export async function getJob(jobId) {
  // Check if it's a real analysis from our backend
  if (jobId.startsWith('demo_')) {
    // Return mock data for demo
    return {
      id: jobId,
      status: "succeeded",
      progress: 1.0,
      previewURL: "/demo/preview.jpg",
      metrics: {
        clubPathDeg: 2.1,
        faceToPathDeg: -1.3,
        attackAngleDeg: -4.6,
        tempoRatio: 3.02
      },
      radar: [
        { metric: "Tempo", score: 78 },
        { metric: "Backswing", score: 72 },
        { metric: "Transition", score: 66 },
        { metric: "Club Path", score: 84 },
        { metric: "Face Angle", score: 69 },
        { metric: "Impact", score: 88 },
      ],
      tempo: [
        { t: "A1", v: 0.38 },
        { t: "A2", v: 0.62 },
        { t: "A3", v: 0.9 },
        { t: "Top", v: 1.0 },
        { t: "D1", v: 0.82 },
        { t: "D2", v: 0.55 },
        { t: "Impact", v: 0.0 },
      ],
      tips: [
        "Great setup position with neutral grip",
        "Smooth takeaway with good tempo",
        "Perfect position at the top",
        "Excellent transition sequence",
        "Solid impact position",
        "Balanced finish position"
      ]
    };
  }

  // Try to get real analysis from backend
  try {
    const response = await fetch(`${API}/swing-analysis/${jobId}`);
    if (response.ok) {
      const analysis = await response.json();
      return {
        id: analysis.id,
        status: "succeeded",
        progress: 1.0,
        metrics: {
          clubPathDeg: analysis.metrics?.club_path_score || 75,
          faceToPathDeg: analysis.metrics?.face_angle_score || 75,
          attackAngleDeg: analysis.metrics?.impact_score || 75,
          tempoRatio: analysis.metrics?.tempo_score || 75
        },
        radar: [
          { metric: "Stance", score: analysis.metrics?.stance_score || 75 },
          { metric: "Backswing", score: analysis.metrics?.backswing_score || 75 },
          { metric: "Downswing", score: analysis.metrics?.downswing_score || 75 },
          { metric: "Impact", score: analysis.metrics?.impact_score || 75 },
          { metric: "Follow Through", score: analysis.metrics?.follow_through_score || 75 },
          { metric: "Balance", score: analysis.metrics?.balance_score || 75 },
        ],
        tempo: [
          { t: "A1", v: 0.38 },
          { t: "A2", v: 0.62 },
          { t: "A3", v: 0.9 },
          { t: "Top", v: 1.0 },
          { t: "D1", v: 0.82 },
          { t: "D2", v: 0.55 },
          { t: "Impact", v: 0.0 },
        ],
        tips: analysis.specific_recommendations || ["Great swing analysis completed!"]
      };
    }
  } catch (error) {
    console.error('Failed to get real analysis:', error);
  }

  return {
    id: jobId,
    status: "failed",
    error: "Analysis not found"
  };
}

export async function pollJob(jobId, onUpdate, opts = {}) {
  const intervalMs = opts.intervalMs || 800;
  const timeoutMs = opts.timeoutMs || 90000;
  const start = Date.now();

  // Immediate first fetch
  let job = await getJob(jobId);
  onUpdate?.(job);
  
  while (job.status === "queued" || job.status === "processing") {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Analysis timed out");
    }
    await new Promise(r => setTimeout(r, intervalMs));
    job = await getJob(jobId);
    onUpdate?.(job);
  }
  
  return job;
}

export function pct(n) {
  if (typeof n !== "number") return 0;
  return Math.max(0, Math.min(100, Math.round(n * 100)));
}