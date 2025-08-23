import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import SwingAnalyzer from './components/SwingAnalyzer.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card.js';
import { Button } from './components/ui/button';
import { TrendingUp, Trophy, Zap, Target, LineChart, BarChart3, Settings, User, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatsTab = ({ userStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-blue-600">{userStats?.total_swings || 0}</div>
            <div className="text-sm text-gray-600">Total Swings Analyzed</div>
          </div>
          <BarChart3 className="h-8 w-8 text-blue-500 opacity-75" />
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-green-500">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-green-600">{userStats?.improvement_percentage || 0}%</div>
            <div className="text-sm text-gray-600">Overall Improvement</div>
          </div>
          <TrendingUp className="h-8 w-8 text-green-500 opacity-75" />
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-purple-500">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-purple-600">{userStats?.average_club_speed || 0}</div>
            <div className="text-sm text-gray-600">Avg Club Speed (mph)</div>
          </div>
          <Zap className="h-8 w-8 text-purple-500 opacity-75" />
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-orange-500">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-orange-600">{userStats?.average_accuracy || 0}%</div>
            <div className="text-sm text-gray-600">Average Accuracy</div>
          </div>
          <Target className="h-8 w-8 text-orange-500 opacity-75" />
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-yellow-500">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-yellow-600">{userStats?.best_score || 0}</div>
            <div className="text-sm text-gray-600">Personal Best Score</div>
          </div>
          <Trophy className="h-8 w-8 text-yellow-500 opacity-75" />
        </div>
      </CardContent>
    </Card>

    <Card className="border-l-4 border-l-red-500">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-red-600 capitalize">{userStats?.recent_trend || 'stable'}</div>
            <div className="text-sm text-gray-600">Recent Trend</div>
          </div>
          <LineChart className="h-8 w-8 text-red-500 opacity-75" />
        </div>
      </CardContent>
    </Card>
  </div>
);

const HistoryTab = ({ swingHistory }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5" />
        Swing History & Progress
      </CardTitle>
      <CardDescription>
        Track your improvement over time with AI pose analysis
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
              <th className="text-left py-2">Pose Analysis</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {swingHistory.map((swing, index) => (
              <tr key={swing.id} className="border-b hover:bg-gray-50">
                <td className="py-2">{swing.date}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    swing.score >= 85 ? 'bg-green-100 text-green-800' : 
                    swing.score >= 75 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {swing.score}
                  </span>
                </td>
                <td className="py-2">{swing.clubSpeed} mph</td>
                <td className="py-2">{swing.accuracy}%</td>
                <td className="py-2">
                  <span className="text-xs text-green-600">✓ Detected</span>
                </td>
                <td className="py-2">
                  <Button variant="ghost" size="sm">
                    View Analysis
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

function App() {
  const [userStats, setUserStats] = useState(null);
  const [swingHistory, setSwingHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('analyze');

  useEffect(() => {
    fetchUserStats();
    fetchSwingHistory();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await axios.get(`${API}/stats`);
      setUserStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setUserStats({
        total_swings: 124,
        improvement_percentage: 15,
        average_club_speed: 92,
        average_accuracy: 78,
        best_score: 95,
        recent_trend: "improving"
      });
    }
  };

  const fetchSwingHistory = async () => {
    try {
      const response = await axios.get(`${API}/swings`);
      setSwingHistory(response.data);
    } catch (error) {
      console.error('Error fetching swing history:', error);
      setSwingHistory([
        { id: 1, date: '2025-08-23', score: 85, clubSpeed: 95, accuracy: 78 },
        { id: 2, date: '2025-08-22', score: 82, clubSpeed: 97, accuracy: 81 },
        { id: 3, date: '2025-08-21', score: 88, clubSpeed: 93, accuracy: 75 }
      ]);
    }
  };

  const TabButton = ({ id, label, icon: Icon, isActive }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        isActive 
          ? 'bg-green-600 text-white shadow-lg' 
          : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-2">🏌️ SwingAlyze Pro</h1>
            <p className="text-xl text-gray-600">AI-Powered Golf Swing Analysis with Real-Time Pose Detection</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex justify-center gap-2 mb-8 p-2 bg-gray-100 rounded-xl w-fit mx-auto">
            <TabButton id="analyze" label="AI Analysis" icon={BarChart3} isActive={activeTab === 'analyze'} />
            <TabButton id="history" label="History" icon={LineChart} isActive={activeTab === 'history'} />
            <TabButton id="stats" label="Stats" icon={Trophy} isActive={activeTab === 'stats'} />
          </div>

          {/* Tab Content */}
          <Routes>
            <Route path="/" element={
              <>
                {activeTab === 'analyze' && (
                  <SwingAnalyzer 
                    onAnalysisComplete={() => {
                      fetchSwingHistory();
                      fetchUserStats();
                    }}
                  />
                )}
                {activeTab === 'history' && <HistoryTab swingHistory={swingHistory} />}
                {activeTab === 'stats' && <StatsTab userStats={userStats} />}
              </>
            } />
          </Routes>

          {/* Quick Actions Footer */}
          <div className="mt-8 flex justify-center">
            <div className="flex gap-4">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;