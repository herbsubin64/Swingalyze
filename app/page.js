'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Check, Zap, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { isStripeEnabled, startDemoTrial, getDemoTrialInfo } from '@/lib/subscription'

export default function PricingPage() {
  const { user, isSupabaseEnabled } = useAuth()
  const [loading, setLoading] = useState(false)
  const [demoTrial, setDemoTrial] = useState(null)
  const [stripeEnabled, setStripeEnabled] = useState(false)

  // Check for existing demo trial and Stripe status
  useEffect(() => {
    setStripeEnabled(isStripeEnabled())
    
    if (typeof window !== 'undefined' && user?.id) {
      const trialInfo = getDemoTrialInfo(user.id)
      setDemoTrial(trialInfo)
    }
  }, [user])

  const handleSubscribe = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    if (!stripeEnabled) {
      alert('Stripe is not configured. Demo trial available instead.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/account?success=true`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
        }),
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Failed to start subscription. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoTrial = () => {
    if (!user?.id) {
      alert('Please sign in to start demo trial')
      return
    }

    const success = startDemoTrial(user.id)
    if (success) {
      const trialInfo = getDemoTrialInfo(user.id)
      setDemoTrial(trialInfo)
      alert('Demo trial activated! You have 24 hours of Pro features.')
    }
  }

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

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Get the insights you need to improve your golf game
          </p>
          
          {!stripeEnabled && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-800">
                  Stripe not configured. Demo trials available for testing.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="text-3xl font-bold">$0<span className="text-lg text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Basic swing analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>3 key swing positions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Basic improvement tips</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Video file up to 20MB</span>
                  </li>
                </ul>

                <Link href="/analyze">
                  <Button variant="outline" className="w-full">
                    Current Plan
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-primary shadow-lg">
              <div className="absolute top-4 right-4">
                <Badge className="bg-primary">
                  <Zap className="w-3 h-3 mr-1" />
                  Pro
                </Badge>
              </div>
              
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="text-3xl font-bold">$9.99<span className="text-lg text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Advanced AI swing analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Detailed biomechanics breakdown</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Personalized training plan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Progress tracking & history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>HD video uploads (100MB)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>PDF analysis reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Priority support</span>
                  </li>
                </ul>

                {stripeEnabled ? (
                  <Button 
                    onClick={handleSubscribe}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Upgrade to Pro'}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    {!demoTrial?.isActive ? (
                      <Button 
                        onClick={handleDemoTrial}
                        className="w-full"
                        disabled={!user || !isSupabaseEnabled}
                      >
                        Start 24h Demo Trial
                      </Button>
                    ) : (
                      <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">
                          Demo Trial Active
                        </p>
                        <p className="text-xs text-green-600">
                          {demoTrial.hoursRemaining} hours remaining
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground text-center">
                      {!isSupabaseEnabled ? 'Sign in required for trial' : 'Payments disabled in demo mode'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Features comparison */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold mb-8">Why upgrade to Pro?</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Advanced Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Get detailed biomechanics data and personalized recommendations
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Progress Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Track your improvement over time with detailed analytics
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Professional Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Download PDF reports to share with coaches and track progress
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
