'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, User, Mail, Calendar, CreditCard, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getDemoTrialInfo } from '@/lib/subscription'

export default function AccountPage() {
  const { user, isLoading, isSupabaseEnabled, signOut } = useAuth()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [demoTrial, setDemoTrial] = useState(null)

  useEffect(() => {
    const fetchAnalyses = async () => {
      if (user?.id) {
        try {
          // Fetch user's analyses
          const response = await fetch('/api/user/analyses')
          if (response.ok) {
            const data = await response.json()
            setAnalyses(data)
          }
        } catch (error) {
          console.error('Error fetching analyses:', error)
        }
      }
      setLoading(false)
    }

    fetchAnalyses()
    
    // Check demo trial status
    if (user?.id) {
      const trialInfo = getDemoTrialInfo(user.id)
      setDemoTrial(trialInfo)
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!isSupabaseEnabled) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Swingalyze</h1>
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Demo Mode</h1>
            <p className="text-muted-foreground mb-8">
              Authentication is disabled. All features are available in demo mode.
            </p>
            <Link href="/analyze">
              <Button size="lg">
                Start Analyzing Your Swing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Swingalyze</h1>
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4">Account Required</h1>
            <p className="text-muted-foreground mb-8">
              Please sign in to access your account.
            </p>
            <Link href="/login">
              <Button size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Target className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Swingalyze</h1>
          </Link>
          
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Account</h1>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {demoTrial?.isActive ? (
                  <div className="space-y-2">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Demo Trial Active
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {demoTrial.hoursRemaining} hours remaining
                    </p>
                  </div>
                ) : (
                  <Badge variant="outline">
                    Free Plan
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Subscription Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  {demoTrial?.isActive ? (
                    <>
                      <Badge className="bg-green-100 text-green-800 border-green-200">Demo Trial</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        Pro features active for {demoTrial.hoursRemaining} more hours
                      </p>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">Free Plan</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        Basic swing analysis features
                      </p>
                    </>
                  )}
                </div>
                
                <Link href="/pricing">
                  <Button className="w-full">
                    {demoTrial?.isActive ? 'Upgrade Before Trial Ends' : 'Upgrade to Pro'}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {analyses.length}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total analyses
                    </p>
                    
                    <div className="mt-4 space-y-2">
                      <Link href="/my-analyses" className="block">
                        <Button variant="outline" className="w-full">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View All Analyses
                        </Button>
                      </Link>
                      
                      <Link href="/analyze" className="block">
                        <Button variant="outline" className="w-full">
                          Analyze New Swing
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Analyses */}
          {analyses.length > 0 && (
            <Card className="mt-8">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Analyses</CardTitle>
                <Link href="/my-analyses">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyses.slice(0, 3).map((analysis) => (
                    <div key={analysis.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Analysis #{analysis.id.slice(-6).toUpperCase()}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{analysis.club}</span>
                        </div>
                      </div>
                      <Link href={`/results/${analysis.id}`}>
                        <Button variant="outline" size="sm">
                          View Results
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}