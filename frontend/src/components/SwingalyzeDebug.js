import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, Play, Gauge, Ruler, TimerReset, Sparkles, ChevronRight,
  CheckCircle2, Image as ImageIcon, Video, GitCompare, Wand2, BarChart4, AlertTriangle, Zap
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  analyzeFromUrl, uploadFile, pollJob, pct, quickAnalyzeFromUrl
} from "../lib/api";
import AnalyserPlayer from "./AnalyserPlayer";
import EnhancedUploadZone from "./EnhancedUploadZone";
import EnhancedMetricCards from "./EnhancedMetricCards";
import AdvancedVideoPlayer from "./AdvancedVideoPlayer";
import SimpleVideoPlayer from "./SimpleVideoPlayer";

const fallbackRadar = [
  { metric: "Tempo", score: 78 },
  { metric: "Backswing", score: 72 },
  { metric: "Transition", score: 66 },
  { metric: "Club Path", score: 84 },
  { metric: "Face Angle", score: 69 },
  { metric: "Impact", score: 88 },
];

const fallbackTempo = [
  { t: "A1", v: 0.38 },
  { t: "A2", v: 0.62 },
  { t: "A3", v: 0.9 },
  { t: "Top", v: 1.0 },
  { t: "D1", v: 0.82 },
  { t: "D2", v: 0.55 },
  { t: "Impact", v: 0.0 },
];

function OverlayToggles() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { id: "swing", label: "Swing Path" },
        { id: "face", label: "Face Angle" },
        { id: "hip", label: "Hip Line" },
        { id: "knee", label: "Knee Trace" },
      ].map((o) => (
        <div key={o.id} className="flex items-center justify-between rounded-xl border bg-white/50 p-3">
          <label htmlFor={o.id} className="text-sm font-medium">{o.label}</label>
          <input type="checkbox" id={o.id} defaultChecked={o.id === "swing"} className="toggle" />
        </div>
      ))}
    </div>
  );
}

function MetricsStrip({ m, hasAnalyzed }) {
  if (!hasAnalyzed) {
    // Show empty state before analysis
    const emptyMetrics = [
      { label: "Club Path", value: "--", numericValue: 0, hint: "swing path", status: null },
      { label: "Face to Path", value: "--", numericValue: 0, hint: "club face angle", status: null },
      { label: "Attack Angle", value: "--", numericValue: 0, hint: "impact angle", status: null },
      { label: "Tempo", value: "--", numericValue: 0, hint: "backswing:downswing", status: null },
    ];
    return <EnhancedMetricCards metrics={emptyMetrics} />;
  }

  const enhancedMetrics = [
    { 
      label: "Club Path", 
      value: `${m?.clubPathDeg ?? +2.1}°`, 
      numericValue: m?.clubPathDeg ?? 2.1,
      hint: "swing path",
      status: m?.clubPathDeg > 0 ? (m?.clubPathDeg > 3 ? 'poor' : 'average') : 'good'
    },
    { 
      label: "Face to Path", 
      value: `${m?.faceToPathDeg ?? -1.3}°`, 
      numericValue: Math.abs(m?.faceToPathDeg ?? -1.3),
      hint: "club face angle",
      status: Math.abs(m?.faceToPathDeg ?? -1.3) < 2 ? 'good' : 'average'
    },
    { 
      label: "Attack Angle", 
      value: `${m?.attackAngleDeg ?? -4.6}°`, 
      numericValue: m?.attackAngleDeg ?? -4.6,
      hint: "impact angle",
      status: (m?.attackAngleDeg ?? -4.6) > -6 && (m?.attackAngleDeg ?? -4.6) < -2 ? 'good' : 'average'
    },
    { 
      label: "Tempo", 
      value: `${m?.tempoRatio ?? 3.02}:1`, 
      numericValue: m?.tempoRatio ?? 3.02,
      hint: "backswing:downswing",
      status: (m?.tempoRatio ?? 3.02) > 2.5 && (m?.tempoRatio ?? 3.02) < 3.5 ? 'good' : 'average'
    },
  ];
  
  return <EnhancedMetricCards metrics={enhancedMetrics} />;
}

function PhaseChips({ tips }) {
  const phases = [
    { key: "Setup", tip: tips?.[0] ?? "Neutral grip, athletic stance", done: true },
    { key: "Takeaway", tip: tips?.[1] ?? "Club low & slow, one-piece", done: true },
    { key: "Top", tip: tips?.[2] ?? "Lead wrist flat, trail elbow under", done: false },
    { key: "Transition", tip: tips?.[3] ?? "Shift-pressure then rotate", done: false },
    { key: "Impact", tip: tips?.[4] ?? "Hands ahead, shaft lean", done: false },
    { key: "Finish", tip: tips?.[5] ?? "Balanced, chest to target", done: false },
  ];
  
  return (
    <div className="flex flex-wrap gap-2">
      {phases.map((p) => (
        <div
          key={p.key}
          className={`rounded-full px-3 py-1 text-xs flex items-center gap-1 ${
            p.done ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"
          }`}
        >
          {p.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span title={p.tip}>{p.key}</span>
        </div>
      ))}
    </div>
  );
}

export default function SwingalyzeDebug() {
  const fileRef = useRef(null);
  const [url, setUrl] = useState("");
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState(null);
  const [activeTab, setActiveTab] = useState("radar");
  const [analysisResults, setAnalysisResults] = useState(null);
  const [quickMode, setQuickMode] = useState(true); // Default to quick mode
  const [hasAnalyzed, setHasAnalyzed] = useState(false); // Track if analysis completed
  const [videoError, setVideoError] = useState(false); // Track video playback errors
  const [debugLog, setDebugLog] = useState([]); // Debug logging

  const radarData = job?.radar?.length ? job.radar : (hasAnalyzed ? fallbackRadar : [
    { metric: "Club Path", score: 0 },
    { metric: "Face Angle", score: 0 },
    { metric: "Attack Angle", score: 0 },
    { metric: "Tempo", score: 0 },
    { metric: "Rotation", score: 0 },
    { metric: "Speed", score: 0 }
  ]);
  const tempoData = job?.tempo?.length ? job.tempo : (hasAnalyzed ? fallbackTempo : []);

  // Generate swing path overlay for video
  const swingPath = useMemo(() => [
    { x: 0.2, y: 0.8 },
    { x: 0.35, y: 0.6 },
    { x: 0.5, y: 0.4 },
    { x: 0.65, y: 0.35 },
    { x: 0.8, y: 0.3 }
  ], []);

  // Generate overlay points
  const overlayPoints = useMemo(() => [
    { x: 0.5, y: 0.4, color: '#ef4444', label: 'Impact' },
    { x: 0.2, y: 0.8, color: '#3b82f6', label: 'Setup' },
    { x: 0.8, y: 0.3, color: '#10b981', label: 'Follow Through' }
  ], []);

  // Debug logging function
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev.slice(-4), { timestamp, message, type }]); // Keep last 5 logs
    console.log(`[SwingAlyze Debug ${timestamp}] ${message}`);
  };

  // Reset all states to initial values
  const resetAllStates = () => {
    addDebugLog('Resetting all states', 'action');
    setUploading(false);
    setBusy(false);
    setError(null);
    setUploadedVideoUrl(null);
    setAnalysisResults(null);
    setJob(null);
    setHasAnalyzed(false);
    setVideoError(false);
    setUrl("");
    // Clear any existing object URLs to prevent memory leaks
    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }
  };

  async function startAnalyze(fromUrl) {
    setError(null);
    setBusy(true);
    try {
      const { jobId, quickResult } = await quickAnalyzeFromUrl(fromUrl);
      
      if (quickResult) {
        // Immediate results for quick analysis
        setAnalysisResults(quickResult);
        setJob({
          id: jobId,
          status: "succeeded",
          progress: 1.0,
          metrics: quickResult.metrics,
          radar: [
            { metric: "Club Path", score: Math.max(0, 100 - Math.abs(quickResult.metrics.club_path_deg * 10)) },
            { metric: "Face Angle", score: Math.max(0, 100 - Math.abs(quickResult.metrics.face_to_path_deg * 15)) },
            { metric: "Attack Angle", score: Math.max(0, 80 + quickResult.metrics.attack_angle_deg) },
            { metric: "Tempo", score: Math.max(0, Math.min(100, quickResult.metrics.tempo_ratio * 30)) },
            { metric: "Rotation", score: Math.min(100, quickResult.metrics.shoulder_rotation_deg * 2) },
            { metric: "Speed", score: Math.min(100, quickResult.metrics.swing_speed_mph) }
          ],
          tempo: [
            { t: "Start", v: 0 },
            { t: "Back", v: 0.6 },
            { t: "Top", v: 1.0 },
            { t: "Down", v: 0.4 },
            { t: "Impact", v: 0.1 },
            { t: "Follow", v: 0.8 }
          ],
          tips: quickResult.recommendations
        });
      } else {
        const final = await pollJob(jobId, (j) => setJob(j));
        setJob(final);
      }
    } catch (e) {
      setError(e?.message || "Analyze error");
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(kind) {
    fileRef.current?.setAttribute("accept", kind === "image" ? "image/*" : "video/*");
    fileRef.current?.click();
  }

  async function onFileChange(file) {
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      const errorMsg = "File too large (max 200MB)";
      setError(errorMsg);
      addDebugLog(errorMsg, 'error');
      return;
    }
    
    // Reset all states - CRITICAL: Clear both uploading AND busy
    addDebugLog(`Starting upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`, 'info');
    setUploading(true);
    setBusy(false); // Ensure busy is false during file upload
    setError(null);
    setHasAnalyzed(false);
    setJob(null);
    setAnalysisResults(null);
    setVideoError(false);
    
    // Create local video URL for preview
    const videoUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(videoUrl);
    addDebugLog('Created video preview URL', 'info');
    
    // Set a timeout to prevent infinite spinning
    const uploadTimeout = setTimeout(() => {
      addDebugLog('Upload/analysis timed out after 30 seconds', 'error');
      setUploading(false);
      setBusy(false); // Clear both states on timeout
      setError("Analysis timed out. Please try again or use the Reset button.");
    }, 30000); // 30 second timeout
    
    try {
      addDebugLog(`Calling uploadFile API with quickMode: ${quickMode}`, 'info');
      const { url, jobId, quickResult } = await uploadFile(file, quickMode);
      
      clearTimeout(uploadTimeout); // Clear timeout on success
      addDebugLog(`Upload API response received. JobID: ${jobId}`, 'info');
      
      if (quickResult) {
        addDebugLog('Quick analysis result received, processing data', 'success');
        // Quick analysis results
        setAnalysisResults(quickResult);
        setHasAnalyzed(true); // Mark as analyzed
        setJob({
          id: jobId,
          status: "succeeded",
          progress: 1.0,
          metrics: quickResult.metrics,
          radar: [
            { metric: "Club Path", score: Math.max(0, 100 - Math.abs(quickResult.metrics.club_path_deg * 10)) },
            { metric: "Face Angle", score: Math.max(0, 100 - Math.abs(quickResult.metrics.face_to_path_deg * 15)) },
            { metric: "Attack Angle", score: Math.max(0, 80 + quickResult.metrics.attack_angle_deg) },
            { metric: "Tempo", score: Math.max(0, Math.min(100, quickResult.metrics.tempo_ratio * 30)) },
            { metric: "Rotation", score: Math.min(100, quickResult.metrics.shoulder_rotation_deg * 2) },
            { metric: "Speed", score: Math.min(100, quickResult.metrics.swing_speed_mph) }
          ],
          tempo: [
            { t: "Start", v: 0 },
            { t: "Back", v: 0.6 },
            { t: "Top", v: 1.0 },
            { t: "Down", v: 0.4 },
            { t: "Impact", v: 0.1 },
            { t: "Follow", v: 0.8 }
          ],
          tips: quickResult.recommendations
        });
        addDebugLog('Analysis completed successfully', 'success');
      } else {
        addDebugLog('No quick result, starting job polling', 'info');
        // Start polling for detailed analysis
        const final = await pollJob(jobId, (j) => {
          addDebugLog(`Job update: ${j.status} - ${(j.progress * 100).toFixed(0)}%`, 'info');
          setJob(j);
        });
        setHasAnalyzed(true);
        setJob(final);
        addDebugLog('Polling completed, analysis finished', 'success');
      }
    } catch (e) {
      clearTimeout(uploadTimeout); // Clear timeout on error
      const errorMsg = e?.message || "Upload failed";
      addDebugLog(`Upload/analysis failed: ${errorMsg}`, 'error');
      console.error("Upload/analysis failed:", e);
      setError(errorMsg);
      setHasAnalyzed(false);
    } finally {
      // CRITICAL FIX: Clear both uploading AND busy states
      setUploading(false);
      setBusy(false);
      addDebugLog('Upload process finished - all states cleared', 'info');
    }
  }

  const progressPct = useMemo(() => pct(job?.progress ?? (busy || uploading ? 0.1 : 0)), [job, busy, uploading]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }} 
      className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900"
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              SwingAlyze <span className="text-green-400">Debug Studio</span>
            </h1>
            <p className="text-gray-300">Professional golf swing analysis with AI-powered insights</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-white">
              <input 
                type="checkbox" 
                checked={quickMode}
                onChange={(e) => setQuickMode(e.target.checked)}
                className="rounded"
              />
              <Zap className="h-4 w-4" />
              <span className="text-sm">Quick Analysis (&lt;3s)</span>
            </label>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-colors"
              onClick={() => startAnalyze("/demo/demo-swing.mp4")}
            >
              <Play className="h-4 w-4" /> Demo Clip
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50"
              disabled={busy || uploading} 
              onClick={() => url && startAnalyze(url)}
            >
              <Sparkles className="h-4 w-4" /> Quick Analyze
            </button>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
              onClick={resetAllStates}
              title="Reset all states and clear any stuck processes"
            >
              <TimerReset className="h-4 w-4" /> Reset
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-400/50 bg-red-900/50 p-3 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {hasAnalyzed && !error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-400/50 bg-green-900/50 p-3 text-sm text-green-200">
            <CheckCircle2 className="h-4 w-4" /> Analysis complete! Results updated below.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white mb-2">Upload Swing</h2>
                <p className="text-gray-300 text-sm">Image or video — MP4, MOV, PNG, JPG (max 30s / 50MB)</p>
              </div>
              
              <EnhancedUploadZone 
                onFile={onFileChange}
                analyzing={uploading || busy}
                progress={progressPct}
              />

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-white">AI Processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">pose, club, ball detection</span>
                    {(uploading || busy) && (
                      <button 
                        onClick={resetAllStates}
                        className="text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Cancel/Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-600 to-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div 
                      key={i} 
                      className={`h-20 rounded-xl ${busy || uploading ? "animate-pulse bg-green-600/20" : "bg-white/5"}`} 
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-xs text-gray-400">Model</div>
                <div className="text-sm font-semibold text-white">Gemini v1.5 • Pose v3</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="text-xs text-gray-400">Latency</div>
                <div className="text-sm font-semibold text-white">{busy ? "analyzing..." : "2.1s avg"}</div>
              </div>
            </div>

            {/* Debug Information */}
            {debugLog.length > 0 && (
              <div className="mt-6 bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <h3 className="text-sm font-medium text-white mb-2">Debug Log</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {debugLog.map((log, i) => (
                    <div key={i} className="text-xs flex gap-2">
                      <span className="text-gray-500">{log.timestamp}</span>
                      <span className={
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'action' ? 'text-blue-400' :
                        'text-gray-300'
                      }>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Preview */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Analysis Preview</h2>
                  <p className="text-gray-300 text-sm">Visual overlays, metrics, and coaching insights</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-colors">
                  <GitCompare className="h-4 w-4" /> Before/After
                </button>
              </div>

              {/* Video Player with Error Handling */}
              {uploadedVideoUrl ? (
                videoError ? (
                  <SimpleVideoPlayer 
                    src={uploadedVideoUrl}
                    onVideoError={(error) => {
                      console.error('Video player error:', error);
                      setVideoError(true);
                    }}
                  />
                ) : (
                  <AdvancedVideoPlayer 
                    src={uploadedVideoUrl}
                    swingData={analysisResults}
                    analysisResults={analysisResults}
                    onAnalysisRequest={async (videoSrc) => {
                      setUploading(true);
                      try {
                        // Quick re-analysis
                        const { quickResult } = await quickAnalyzeFromUrl(videoSrc);
                        if (quickResult) {
                          setAnalysisResults(quickResult);
                        }
                      } catch (e) {
                        console.error('Re-analysis failed:', e);
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                )
              ) : (
                <div className="aspect-video bg-gradient-to-br from-green-800/20 to-emerald-800/20 rounded-2xl border border-white/20 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Upload a swing video</p>
                    <p className="text-sm">See professional analysis with frame-by-frame playback</p>
                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      <p>📹 Best formats: MP4, WebM</p>
                      <p>⚠️ .MOV files may not work in all browsers</p>
                    </div>
                  </div>
                </div>
              )}

              <MetricsStrip m={job?.metrics} hasAnalyzed={hasAnalyzed} />

              {/* Tabs */}
              <div className="mt-6">
                <div className="flex bg-white/5 rounded-xl p-1 mb-4">
                  {[
                    { id: "radar", label: "Profile", icon: BarChart4 },
                    { id: "tempo", label: "Tempo", icon: TimerReset },
                    { id: "overlays", label: "Overlays", icon: Wand2 },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id 
                          ? "bg-green-600 text-white" 
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <tab.icon className="h-4 w-4" /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white/5 rounded-xl p-4">
                  {activeTab === "radar" && (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                          <PolarGrid stroke="#374151" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                          <Radar dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeTab === "tempo" && (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tempoData} margin={{ left: 12, right: 12, top: 10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="t" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} domain={[0, 1]} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#f9fafb'
                            }} 
                          />
                          <Line type="monotone" dataKey="v" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeTab === "overlays" && <OverlayToggles />}
                </div>
              </div>

              {/* Swing Phases */}
              <div className="mt-6 space-y-3">
                <div className="text-sm font-semibold text-white">Swing Phases</div>
                <PhaseChips tips={job?.tips} />
                <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-sm text-gray-300">
                  <span className="font-medium text-white">Coaching cue:</span> {job?.tips?.[2] ?? "At the top, feel the trail elbow under the shaft and start the downswing by pressure-shifting into the lead foot before turning."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row Features */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Compare Sessions */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Compare Sessions</h3>
              <p className="text-gray-300 text-sm">Track progress over time</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-video overflow-hidden rounded-xl border border-white/20 bg-white/5" />
                ))}
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-colors">
                <GitCompare className="h-4 w-4" /> Open Comparator
              </button>
            </div>
          </div>

          {/* Suggested Drills */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Suggested Drills</h3>
              <p className="text-gray-300 text-sm">Personalized from your metrics</p>
            </div>
            <div className="space-y-2">
              {[
                { name: "Alignment Stick Gate", tag: "Path" },
                { name: "Pump to Impact", tag: "Transition" },
                { name: "Feet-Together Swings", tag: "Tempo" },
              ].map((d) => (
                <div key={d.name} className="flex items-center justify-between rounded-xl border border-white/20 p-3 bg-white/5">
                  <div>
                    <div className="text-sm font-medium text-white">{d.name}</div>
                    <div className="text-xs text-gray-400">Focus: {d.tag}</div>
                  </div>
                  <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                    Start
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Export & Share */}
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Export & Share</h3>
              <p className="text-gray-300 text-sm">Clips, reports, and coach links</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/20 p-3 bg-white/5">
                <div className="text-sm font-medium text-white">30s Highlight Reel</div>
                <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                  Render
                </button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/20 p-3 bg-white/5">
                <div className="text-sm font-medium text-white">PDF Coaching Report</div>
                <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg border border-white/20 transition-colors">
                  Create
                </button>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/20 p-3 bg-white/5">
                <div className="text-sm font-medium text-white">Share to Coach</div>
                <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg border border-white/20 transition-colors">
                  Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}