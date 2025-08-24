import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription } from './components/ui/alert';
import { Separator } from './components/ui/separator';
import { Trash2, TrendingUp, Target, Zap, BarChart3 } from 'lucide-react';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Home/Dashboard Component
const Dashboard = () => {
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [analysesRes, playersRes] = await Promise.all([
        axios.get(`${API}/analysis?limit=10`),
        axios.get(`${API}/players`)
      ]);
      setRecentAnalyses(analysesRes.data);
      setPlayers(playersRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SwingAnalyze Dashboard</h1>
          <p className="text-gray-600">Track and analyze golf swing performance</p>
        </div>
        <Link to="/new-analysis">
          <Button className="bg-green-600 hover:bg-green-700">
            <Target className="w-4 h-4 mr-2" />
            New Analysis
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{players.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAnalyses.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentAnalyses.filter(a => 
                new Date(a.timestamp).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
          <CardDescription>Latest swing analysis records</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAnalyses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No analyses yet. Create your first analysis!</p>
          ) : (
            <div className="space-y-4">
              {recentAnalyses.slice(0, 5).map((analysis) => (
                <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{analysis.player_name}</h3>
                      <Badge variant="outline">{analysis.club_type}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {analysis.swing_speed && `Swing: ${analysis.swing_speed} mph`}
                      {analysis.distance && ` • Distance: ${analysis.distance} yards`}
                      {analysis.accuracy_rating && ` • Accuracy: ${analysis.accuracy_rating}/10`}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(analysis.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// New Analysis Component
const NewAnalysis = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    player_name: '',
    club_type: '',
    swing_speed: '',
    ball_speed: '',
    distance: '',
    accuracy_rating: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const clubTypes = [
    'Driver', 'Fairway Wood', '3-Wood', '5-Wood', 'Hybrid',
    '3-Iron', '4-Iron', '5-Iron', '6-Iron', '7-Iron', '8-Iron', '9-Iron',
    'Pitching Wedge', 'Gap Wedge', 'Sand Wedge', 'Lob Wedge', 'Putter'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.player_name || !formData.club_type) {
      setError('Player name and club type are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...formData,
        swing_speed: formData.swing_speed ? parseFloat(formData.swing_speed) : null,
        ball_speed: formData.ball_speed ? parseFloat(formData.ball_speed) : null,
        distance: formData.distance ? parseFloat(formData.distance) : null,
        accuracy_rating: formData.accuracy_rating ? parseInt(formData.accuracy_rating) : null
      };

      await axios.post(`${API}/analysis`, payload);
      navigate('/analyses');
    } catch (error) {
      setError('Failed to save analysis. Please try again.');
      console.error('Error saving analysis:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">New Swing Analysis</h1>
        <p className="text-gray-600">Record a new golf swing analysis</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="player_name">Player Name *</Label>
                <Input
                  id="player_name"
                  value={formData.player_name}
                  onChange={(e) => handleInputChange('player_name', e.target.value)}
                  placeholder="Enter player name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="club_type">Club Type *</Label>
                <Select onValueChange={(value) => handleInputChange('club_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select club type" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubTypes.map((club) => (
                      <SelectItem key={club} value={club}>{club}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="swing_speed">Swing Speed (mph)</Label>
                <Input
                  id="swing_speed"
                  type="number"
                  step="0.1"
                  value={formData.swing_speed}
                  onChange={(e) => handleInputChange('swing_speed', e.target.value)}
                  placeholder="e.g. 95.5"
                />
              </div>

              <div>
                <Label htmlFor="ball_speed">Ball Speed (mph)</Label>
                <Input
                  id="ball_speed"
                  type="number"
                  step="0.1"
                  value={formData.ball_speed}
                  onChange={(e) => handleInputChange('ball_speed', e.target.value)}
                  placeholder="e.g. 140.2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="distance">Distance (yards)</Label>
                <Input
                  id="distance"
                  type="number"
                  step="0.1"
                  value={formData.distance}
                  onChange={(e) => handleInputChange('distance', e.target.value)}
                  placeholder="e.g. 280"
                />
              </div>

              <div>
                <Label htmlFor="accuracy_rating">Accuracy Rating (1-10)</Label>
                <Select onValueChange={(value) => handleInputChange('accuracy_rating', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rate accuracy" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>{rating}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows="3"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about the swing..."
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? 'Saving...' : 'Save Analysis'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Analyses List Component
const AnalysesList = () => {
  const [analyses, setAnalyses] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedPlayer]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analysesRes, playersRes] = await Promise.all([
        axios.get(`${API}/analysis${selectedPlayer ? `?player_name=${selectedPlayer}` : ''}`),
        axios.get(`${API}/players`)
      ]);
      setAnalyses(analysesRes.data);
      setPlayers(playersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysis = async (id) => {
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      try {
        await axios.delete(`${API}/analysis/${id}`);
        setAnalyses(prev => prev.filter(a => a.id !== id));
      } catch (error) {
        console.error('Error deleting analysis:', error);
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Swing Analyses</h1>
          <p className="text-gray-600">View and manage all swing analysis records</p>
        </div>
        <Link to="/new-analysis">
          <Button className="bg-green-600 hover:bg-green-700">New Analysis</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter by Player</CardTitle>
            <Select onValueChange={setSelectedPlayer} value={selectedPlayer}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All players</SelectItem>
                {players.map((player) => (
                  <SelectItem key={player} value={player || ""}>{player}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {analyses.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {selectedPlayer ? `No analyses found for ${selectedPlayer}` : 'No analyses found'}
            </p>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis) => (
                <div key={analysis.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">{analysis.player_name}</h3>
                        <Badge variant="outline">{analysis.club_type}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {analysis.swing_speed && (
                          <div>
                            <span className="text-gray-600">Swing Speed:</span>
                            <span className="font-medium ml-1">{analysis.swing_speed} mph</span>
                          </div>
                        )}
                        {analysis.ball_speed && (
                          <div>
                            <span className="text-gray-600">Ball Speed:</span>
                            <span className="font-medium ml-1">{analysis.ball_speed} mph</span>
                          </div>
                        )}
                        {analysis.distance && (
                          <div>
                            <span className="text-gray-600">Distance:</span>
                            <span className="font-medium ml-1">{analysis.distance} yards</span>
                          </div>
                        )}
                        {analysis.accuracy_rating && (
                          <div>
                            <span className="text-gray-600">Accuracy:</span>
                            <span className="font-medium ml-1">{analysis.accuracy_rating}/10</span>
                          </div>
                        )}
                      </div>

                      {analysis.notes && (
                        <div className="mt-2">
                          <span className="text-gray-600 text-sm">Notes:</span>
                          <p className="text-sm mt-1">{analysis.notes}</p>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mt-3">
                        {new Date(analysis.timestamp).toLocaleString()}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAnalysis(analysis.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Player Stats Component
const PlayerStats = () => {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchPlayerStats = async (playerName) => {
    if (!playerName) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/stats/${playerName}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching player stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelect = (playerName) => {
    setSelectedPlayer(playerName);
    fetchPlayerStats(playerName);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Player Statistics</h1>
        <p className="text-gray-600">View detailed performance statistics for each player</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Player</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handlePlayerSelect} value={selectedPlayer}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a player to view stats" />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player} value={player || ""}>{player}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && <div className="flex items-center justify-center h-64">Loading stats...</div>}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Swings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total_swings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Swing Speed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avg_swing_speed} <span className="text-lg text-gray-600">mph</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Ball Speed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avg_ball_speed} <span className="text-lg text-gray-600">mph</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Distance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avg_distance} <span className="text-lg text-gray-600">yards</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avg_accuracy} <span className="text-lg text-gray-600">/10</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Best Distance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.best_distance} <span className="text-lg text-gray-600">yards</span></div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Most Used Club</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.most_used_club}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <Target className="w-8 h-8 text-green-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">SwingAnalyze</span>
            </Link>
          </div>
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
              Dashboard
            </Link>
            <Link to="/analyses" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
              Analyses
            </Link>
            <Link to="/stats" className="text-gray-700 hover:text-green-600 px-3 py-2 rounded-md text-sm font-medium">
              Player Stats
            </Link>
            <Link to="/new-analysis">
              <Button size="sm" className="bg-green-600 hover:bg-green-700">New Analysis</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new-analysis" element={<NewAnalysis />} />
            <Route path="/analyses" element={<AnalysesList />} />
            <Route path="/stats" element={<PlayerStats />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;