import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Upload, BarChart3, Target, TrendingUp, Play, FileVideo, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SwingAnalyzer = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [swingHistory, setSwingHistory] = useState([]);

  useEffect(() => {
    fetchSwingHistory();
  }, []);

  const fetchSwingHistory = async () => {
    try {
      const response = await axios.get(`${API}/swings`);
      setSwingHistory(response.data);
    } catch (error) {
      console.error('Error fetching swing history:', error);
      // Mock data for demo
      setSwingHistory([
        { id: 1, date: '2025-08-23', score: 85, clubSpeed: 95, accuracy: 78 },
        { id: 2, date: '2025-08-22', score: 82, clubSpeed: 97, accuracy: 81 },
        { id: 3, date: '2025-08-21', score: 88, clubSpeed: 93, accuracy: 75 }
      ]);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setUploadedFile(file);
  };

  const analyzeSwing = async () => {
    if (!uploadedFile) return;
    
    setIsAnalyzing(true);
    try {
      // Simulate analysis - in real app, this would upload and analyze the video
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockAnalysis = {
        clubSpeed: Math.floor(Math.random() * 30) + 85,
        ballSpeed: Math.floor(Math.random() * 40) + 120,
        launchAngle: Math.floor(Math.random() * 10) + 12,
        accuracy: Math.floor(Math.random() * 25) + 70,
        consistency: Math.floor(Math.random() * 20) + 75,
        recommendations: [
          "Focus on maintaining steady tempo throughout the swing",
          "Work on hip rotation for increased power",
          "Keep head position steady during impact"
        ]
      };
      
      setAnalysisResult(mockAnalysis);
      fetchSwingHistory(); // Refresh history
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏌️ SwingAlyze</h1>
          <p className="text-xl text-gray-600">Professional Golf Swing Analysis Platform</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Upload Section */}
          <Card className="border-2 border-dashed border-green-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Swing Video
              </CardTitle>
              <CardDescription>
                Upload your golf swing video for AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <Label htmlFor="swing-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileVideo className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">MP4, MOV, AVI (MAX. 100MB)</p>
                  </div>
                  <Input
                    id="swing-upload"
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={handleFileUpload}
                  />
                </Label>
              </div>
              
              {uploadedFile && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    <strong>File selected:</strong> {uploadedFile.name}
                  </p>
                </div>
              )}
              
              <Button 
                onClick={analyzeSwing} 
                disabled={!uploadedFile || isAnalyzing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing Swing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze Swing
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Swing Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysisResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{analysisResult.clubSpeed}</div>
                      <div className="text-sm text-gray-600">Club Speed (mph)</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{analysisResult.ballSpeed}</div>
                      <div className="text-sm text-gray-600">Ball Speed (mph)</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{analysisResult.launchAngle}°</div>
                      <div className="text-sm text-gray-600">Launch Angle</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{analysisResult.accuracy}%</div>
                      <div className="text-sm text-gray-600">Accuracy</div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">AI Recommendations:</h4>
                    <ul className="space-y-1">
                      {analysisResult.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-500">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload and analyze a swing video to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Swing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Swing History & Progress
            </CardTitle>
            <CardDescription>
              Track your improvement over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Score</th>
                    <th className="text-left py-2">Club Speed</th>
                    <th className="text-left py-2">Accuracy</th>
                    <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {swingHistory.map((swing) => (
                    <tr key={swing.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{swing.date}</td>
                      <td className="py-2">{swing.score}</td>
                      <td className="py-2">{swing.clubSpeed} mph</td>
                      <td className="py-2">{swing.accuracy}%</td>
                      <td className="py-2">
                        <Button variant="ghost" size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">124</div>
              <div className="text-sm text-gray-600">Swings Analyzed</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">15%</div>
              <div className="text-sm text-gray-600">Improvement</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">92</div>
              <div className="text-sm text-gray-600">Avg Club Speed</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SwingAnalyzer />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;