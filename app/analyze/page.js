export default function AnalyzePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff' }}>
      <header style={{ borderBottom: '1px solid #e5e5e5', padding: '16px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <a href="/" style={{ textDecoration: 'none', color: '#000000', fontSize: '24px', fontWeight: 'bold' }}>
            ← Swingalyze
          </a>
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '24px', color: '#000000' }}>
          Analyze Your Golf Swing
        </h1>
        <p style={{ fontSize: '18px', color: '#666666', marginBottom: '32px' }}>
          Upload a 5-15 second video of your golf swing for instant AI analysis
        </p>
        
        <div style={{ padding: '32px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#000000' }}>Coming Soon!</h3>
          <p style={{ color: '#666666' }}>
            Video upload and analysis features are being implemented.
          </p>
        </div>

        <a 
          href="/"
          style={{
            display: 'inline-block',
            backgroundColor: '#6b7280',
            color: 'white',
            padding: '12px 24px',
            fontSize: '16px',
            textDecoration: 'none',
            borderRadius: '6px'
          }}
        >
          Back to Home
        </a>
      </main>
    </div>
  )
}
