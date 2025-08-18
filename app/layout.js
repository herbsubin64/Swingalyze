// app/layout.js

export const metadata = {
  title: "Swingalyze",
  description: "AI-powered sports swing analyzer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
