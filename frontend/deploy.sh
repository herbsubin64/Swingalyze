set -euo pipefail

echo "== Detecting project type (Vite vs CRA)…"
IS_VITE=0
[ -f vite.config.ts ] || [ -f vite.config.js ] && IS_VITE=1
if [ $IS_VITE -eq 0 ]; then
  # Fallback detection from package.json
  if grep -q '"vite"' package.json 2>/dev/null; then IS_VITE=1; fi
fi

mkdir -p public

# Common headers (CSP relaxed enough for your own assets)
cat > public/_headers <<'EOF'
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: no-referrer-when-downgrade
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'self';
EOF

if [ $IS_VITE -eq 1 ]; then
  echo "== Vite app detected"
  # Ensure plugin + scripts
  npm pkg set type=module >/dev/null 2>&1 || true
  npm pkg set scripts.dev="vite" >/dev/null
  npm pkg set scripts.build="vite build" >/dev/null
  npm pkg set scripts.preview="vite preview --host --strictPort" >/dev/null

  # Add deps if missing
  npm pkg get devDependencies.vite | grep -qv null || npm i -D vite@^5
  npm pkg get devDependencies.@vitejs/plugin-react | grep -qv null || npm i -D @vitejs/plugin-react@^4
  npm pkg get dependencies.react | grep -qv null || npm i react@^18 react-dom@^18

  # Create a minimal vite.config if missing (keeps your src/ structure intact)
  if [ ! -f vite.config.ts ] && [ ! -f vite.config.js ]; then
    cat > vite.config.ts <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'dist', target: 'es2017', sourcemap: true, assetsInlineLimit: 0 },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 5173 }
})
EOF
  fi

  # Emergent config for static publish
  cat > emergent.json <<'EOF'
{
  "$schema": "https://app.emergent.sh/schema.json",
  "framework": "static",
  "build": { "command": "npm run build", "output": "dist", "node": "20" },
  "static": {
    "headers": [
      {
        "source": "/:path*",
        "headers": {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "SAMEORIGIN",
          "Referrer-Policy": "no-referrer-when-downgrade",
          "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'self';"
        }
      }
    ]
  }
}
EOF

  echo "== Installing and building (Vite)…"
  npm i
  npm run build

  echo "== Done. In Emergent, set Publish directory to: dist"

else
  echo "== CRA app detected (or defaulting to CRA-style build)"
  # Ensure CRA scripts
  npm pkg set scripts.start="react-scripts start" >/dev/null
  npm pkg set scripts.build="react-scripts build" >/dev/null
  npm pkg set scripts.serve="npx serve -s build -l 3000" >/dev/null

  # Add deps if missing
  npm pkg get dependencies.react | grep -qv null || npm i react@^18 react-dom@^18
  npm pkg get dependencies.react-scripts | grep -qv null || npm i react-scripts@5 -D

  # Emergent config for CRA
  cat > emergent.json <<'EOF'
{
  "$schema": "https://app.emergent.sh/schema.json",
  "framework": "static",
  "build": { "command": "npm run build", "output": "build", "node": "20" },
  "static": {
    "headers": [
      {
        "source": "/:path*",
        "headers": {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "SAMEORIGIN",
          "Referrer-Policy": "no-referrer-when-downgrade",
          "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'self';"
        }
      }
    ]
  }
}
EOF

  echo "== Installing and building (CRA)…"
  npm i
  npm run build

  echo "== Done. In Emergent, set Publish directory to: build"
fi

echo "== Next step: redeploy this project in Emergent with the publish dir above."
echo "== After deploy, if page still shows the 'enable JavaScript' line, open the browser console:"
echo "   - If 404s on /assets/*.js → publish dir or base path is wrong."
echo "   - If CSP errors → ensure emergent.json or public/_headers were applied."