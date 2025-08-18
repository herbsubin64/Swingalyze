export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', padding: '16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>Swingalyze</h1>
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '24px', color: '#000000' }}>
          AI Golf Swing Analysis
        </h1>
        <p style={{ fontSize: '20px', color: '#666666', marginBottom: '32px' }}>
          Instant, actionable feedback. Upload your swing and get a pro-style breakdown in seconds.
        </p>
        
        <a 
          href="/analyze"
          style={{
            display: 'inline-block',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: '600',
            textDecoration: 'none',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Try Free Analysis
        </a>

        <div style={{ marginTop: '64px', padding: '32px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#000000' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginTop: '24px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#000000' }}>1. Upload Video</h3>
              <p style={{ color: '#666666' }}>Record your golf swing and upload it</p>
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#000000' }}>2. AI Analysis</h3>
              <p style={{ color: '#666666' }}>Our AI analyzes your swing mechanics</p>
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#000000' }}>3. Get Feedback</h3>
              <p style={{ color: '#666666' }}>Receive actionable tips to improve</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
