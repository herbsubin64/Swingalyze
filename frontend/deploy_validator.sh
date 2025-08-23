# --- swingalyze non-destructive deploy validator + ghost-overlay readiness ---
set -euo pipefail
echo "▶ Checking project…"

HAS_VITE=0
[ -f vite.config.ts ] || [ -f vite.config.js ] && HAS_VITE=1
if [ $HAS_VITE -eq 0 ] && grep -q '"vite"' package.json 2>/dev/null; then HAS_VITE=1; fi

mkdir -p public

# 1) CSP/headersonly if missing or outdated
NEEDED_CSP="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https: wss:; media-src 'self' blob: data:; worker-src 'self' blob:; frame-ancestors 'self';"
if [ -f public/_headers ] && grep -q "Content-Security-Policy: $NEEDED_CSP" public/_headers; then
  echo "✅ headers: OK"
else
  cat > public/_headers <<EOF
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: no-referrer-when-downgrade
  Content-Security-Policy: $NEEDED_CSP
EOF
  echo "✅ headers: FIXED (public/_headers)"
fi

# 2) emergent.json (publish dir depends on Vite/CRA)
if [ $HAS_VITE -eq 1 ]; then OUTDIR="dist"; else OUTDIR="build"; fi
NEEDED_EMERGENT=$(cat <<JSON
{
  "\$schema": "https://app.emergent.sh/schema.json",
  "framework": "static",
  "build": { "command": "npm run build", "output": "$OUTDIR", "node": "20" },
  "static": {
    "headers": [
      {
        "source": "/:path*",
        "headers": {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "SAMEORIGIN",
          "Referrer-Policy": "no-referrer-when-downgrade",
          "Content-Security-Policy": "$NEEDED_CSP"
        }
      }
    ]
  }
}
JSON
)
if [ -f emergent.json ] && grep -q "\"output\": \"$OUTDIR\"" emergent.json; then
  echo "✅ emergent.json: OK (output=$OUTDIR)"
else
  printf "%s\n" "$NEEDED_EMERGENT" > emergent.json
  echo "✅ emergent.json: FIXED (output=$OUTDIR)"
fi

# 3) Framework-specific checks
if [ $HAS_VITE -eq 1 ]; then
  echo "▶ Vite detected"
  # Ensure scripts
  npm pkg set scripts.dev="vite" >/dev/null
  npm pkg set scripts.build="vite build" >/dev/null
  npm pkg set scripts.preview="vite preview --host --strictPort" >/dev/null

  # Ensure vite config has base:'/' and outDir:'dist'
  CFG="vite.config.ts"; [ -f vite.config.js ] && CFG="vite.config.js"
  if [ -f "$CFG" ]; then
    if grep -q "base:" "$CFG"; then
      sed -i "s/base:\s*['\"][^'\"]*['\"]/base: '\/'/g" "$CFG"
      echo "✅ $CFG base:'/': OK/FIXED"
    else
      # inject base inside defineConfig
      sed -i "s/defineConfig({/defineConfig({ base: '\/',/g" "$CFG"
      echo "✅ $CFG base:'/': FIXED (injected)"
    fi
    # ensure outDir dist
    if ! grep -q "outDir:\s*'dist'" "$CFG"; then
      sed -i "s/build:\s*{[^}]*}/build: { outDir: 'dist' }/g" "$CFG" || true
      if ! grep -q "outDir:\s*'dist'" "$CFG"; then
        # append minimal build block if not found
        sed -i "s/defineConfig({/defineConfig({ build: { outDir: 'dist' },/g" "$CFG"
      fi
      echo "✅ $CFG outDir:'dist': FIXED"
    else
      echo "✅ $CFG outDir:'dist': OK"
    fi
  else
    # create minimal vite config
    cat > vite.config.js <<'EOF'
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
    echo "✅ vite.config.js: CREATED"
  fi

  # 4) Index entry (module script)
  if [ -f index.html ]; then
    if ! grep -q 'type="module"' index.html; then
      sed -i "s#<script[^>]*src=.*#<script type=\"module\" src=\"/src/main.jsx\"></script>#g" index.html || true
    fi
    echo "✅ index.html: OK (module entry)"
  else
    cat > index.html <<'EOF'
<!doctype html>
<html lang="en"><head>
  <meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Swingalyze</title>
</head><body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body></html>
EOF
    echo "✅ index.html: CREATED"
  fi

else
  echo "▶ CRA detected (or vite not detected)"
  npm pkg set scripts.start="react-scripts start" >/dev/null
  npm pkg set scripts.build="react-scripts build" >/dev/null
  echo "✅ react-scripts: scripts OK (publish=$OUTDIR)"
fi

echo "▶ Installing deps (this may take a bit)…"
npm i

echo "▶ Building…"
npm run build

echo
echo "🎯 RESULT:"
echo "• Build command: npm run build"
echo "• Publish directory: $OUTDIR"
echo "• If the page still shows only the 'enable JavaScript' message:"
echo "  - Check DevTools → Network for 404s on /assets/*.js (means wrong publish dir/base)."
echo "  - Check Console for CSP errors (then ensure public/_headers or emergent.json is applied)."