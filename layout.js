export const metadata = {
  title: 'Swingalyze - AI Golf Swing Analysis',
  description: 'Get instant, actionable feedback on your golf swing with AI-powered analysis',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
