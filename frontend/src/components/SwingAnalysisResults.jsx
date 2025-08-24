import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Zap, 
  BarChart3, 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SwingAnalysisResults = ({ analysisId, onClose }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    fetchAnalysisResults();
    
    // Start polling for results if analysis is still processing
    const interval = setInterval(() => {
      fetchAnalysisResults();
    }, 3000); // Poll every 3 seconds
    
    setPollingInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [analysisId]);

  const fetchAnalysisResults = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/analysis/${analysisId}/ai-results`);
      const data = response.data;
      
      setResults(data);
      
      // Stop polling if analysis is completed or failed
      if (data.status === 'completed' || data.status === 'failed') {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analysis results:', error);
      setError('Failed to fetch analysis results');
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatMetricValue = (value, unit = '') => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      return `${value.toFixed(2)}${unit}`;
    }
    return value;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span>Loading analysis results...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-96">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={onClose} className="w-full mt-4">Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { status, results: analysisData } = results;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto w-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold">AI Swing Analysis</h2>
                <p className="text-gray-600">Powered by Computer Vision & Machine Learning</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(status)}
                <Badge className={getStatusColor(status)}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
              <Button onClick={onClose} variant="outline">Close</Button>
            </div>
          </div>

          {/* Status-based Content */}
          {status === 'pending' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your swing analysis is queued for processing. This usually takes 30-60 seconds.
              </AlertDescription>
            </Alert>
          )}

          {status === 'processing' && (
            <div className="space-y-4">
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  AI is analyzing your swing video. This may take a minute...
                </AlertDescription>
              </Alert>
              <Progress value={66} className="w-full" />
            </div>
          )}

          {status === 'failed' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Analysis failed: {analysisData?.error || 'Unknown error occurred'}
              </AlertDescription>
            </Alert>
          )}

          {status === 'completed' && analysisData && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="phases">Swing Phases</TabsTrigger>
                <TabsTrigger value="recommendations">Tips</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analysisData.overall_score}/100</div>
                      <Progress value={analysisData.overall_score} className="mt-2" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Frames Analyzed</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analysisData.pose_data?.frames_with_pose || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        of {analysisData.pose_data?.total_frames_analyzed || 0} total frames
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Video Duration</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {(analysisData.video_info?.duration || 0).toFixed(1)}s
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @ {Math.round(analysisData.video_info?.fps || 0)} FPS
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Annotated Video */}
                {analysisData.annotated_video_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Analyzed Swing Video</CardTitle>
                      <CardDescription>
                        Your swing with AI pose detection and analysis overlays
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <video
                        controls
                        className="w-full max-h-96 rounded-lg"
                        src={`${BACKEND_URL}${analysisData.annotated_video_url}`}
                      >
                        Your browser does not support video playback.
                      </video>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4">
                {analysisData.swing_analysis?.swing_metrics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Swing Speed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatMetricValue(analysisData.swing_analysis.swing_metrics.max_wrist_speed, ' units/s')}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">Maximum wrist velocity during swing</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Swing Tempo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatMetricValue(analysisData.swing_analysis.swing_metrics.tempo_ratio, ':1')}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">Backswing to downswing ratio</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {analysisData.swing_analysis?.body_angles && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Body Angles Analysis</CardTitle>
                      <CardDescription>Key body angles throughout your swing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(analysisData.swing_analysis.body_angles).map(([angleName, angleData]) => (
                          <div key={angleName} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="font-medium capitalize">{angleName.replace('_', ' ')}</span>
                            <div className="text-right">
                              <div className="font-bold">{angleData.avg?.toFixed(1)}° avg</div>
                              <div className="text-sm text-gray-600">
                                Range: {angleData.min?.toFixed(1)}° - {angleData.max?.toFixed(1)}°
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="phases" className="space-y-4">
                {analysisData.swing_analysis?.swing_phases && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Swing Phase Detection</CardTitle>
                      <CardDescription>Key moments identified in your swing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(analysisData.swing_analysis.swing_phases)
                          .filter(([phase, data]) => phase !== 'error')
                          .map(([phase, data]) => (
                          <div key={phase} className="flex justify-between items-center p-4 border rounded-lg">
                            <div>
                              <h3 className="font-medium capitalize">{phase.replace('_', ' ')}</h3>
                              <p className="text-sm text-gray-600">Frame {data.frame}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{data.timestamp?.toFixed(2)}s</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                {analysisData.recommendations && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Personalized Recommendations
                      </CardTitle>
                      <CardDescription>
                        AI-generated tips to improve your golf swing
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisData.recommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                            <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <p className="text-sm">{recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default SwingAnalysisResults;