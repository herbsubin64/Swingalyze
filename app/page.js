// app/page.js
export default function Home() {
  return (
    <main style={{maxWidth:960, margin:"0 auto", padding:"48px 24px", fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif"}}>
      <header style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24}}>
        <div style={{fontWeight:700, fontSize:20}}>Swingalyze</div>
        <nav style={{display:"flex", gap:16}}>
          <a href="/pricing">Pricing</a>
          <a href="/login">Sign in</a>
        </nav>
      </header>

      <section style={{textAlign:"center", padding:"40px 0"}}>
        <h1 style={{fontSize:40, lineHeight:1.1, margin:"0 0 12px"}}>Analyze your swing in seconds.</h1>
        <p style={{fontSize:18, color:"#444", margin:"0 0 24px"}}>
          AI feedback for golf, tennis, baseball, pickleball, and shooting form—right from your phone.
        </p>
        <div style={{display:"flex", gap:12, justifyContent:"center"}}>
          <a href="/analyze" style={{padding:"12px 18px", border:"1px solid #000", borderRadius:8, textDecoration:"none"}}>Start Free Demo</a>
          <a href="/pricing" style={{padding:"12px 18px", border:"1px solid #ccc", borderRadius:8, textDecoration:"none"}}>See Pricing</a>
        </div>
      </section>

      <section style={{display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:16, marginTop:48}}>
        {[
          ["Instant AI breakdown", "Upload or record, get key metrics + coaching cues."],
          ["Multi-sport", "Golf, tennis, baseball, pickleball, basketball."],
          ["No setup", "Works on mobile—no sensors or wearables."],
          ["Shareable", "One-tap share for coaches and friends."]
        ].map(([title, body]) => (
          <div key={title} style={{border:"1px solid #eee", borderRadius:12, padding:16}}>
            <div style={{fontWeight:600, marginBottom:8}}>{title}</div>
            <div style={{color:"#555"}}>{body}</div>
          </div>
        ))}
      </section>

      <footer style={{marginTop:56, textAlign:"center", color:"#666"}}>© {new Date().getFullYear()} Swingalyze</footer>
    </main>
  );
}
