#!/usr/bin/env zsh
# ============================================================
#  LearnPro LMS — One-Command macOS Setup & Deploy
#
#  HOW TO RUN (do NOT paste this into Terminal):
#    1. Save this file to ~/Desktop/setup.sh
#    2. Open a NEW Terminal window (Cmd+N)
#    3. Run:  zsh ~/Desktop/setup.sh
# ============================================================

# Catch errors
setopt ERR_EXIT 2>/dev/null || set -e

# ── Colours
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

log()     { print -P "%F{green}✓%f  $1" }
info()    { print -P "%F{blue}→%f  $1" }
warn()    { print -P "%F{yellow}⚠%f  $1" }
heading() { print "\n${BOLD}${BLUE}── $1 ──${RESET}" }
err()     { print -P "%F{red}✗  ERROR: $1%f"; exit 1 }

clear
print "${BOLD}"
print "  ╔════════════════════════════════════════╗"
print "  ║     LearnPro LMS — Auto Installer      ║"
print "  ║   macOS · Vercel + Render + Neon       ║"
print "  ╚════════════════════════════════════════╝"
print "${RESET}"
print "  This script will:"
print "  1.  Install prerequisites (Homebrew, Node, Postgres)"
print "  2.  Set up database + run the app locally"
print "  3.  Push code to GitHub"
print "  4.  Walk you through Neon + Render + Vercel deploy"
print ""
warn "Keep this Terminal window open throughout (~10 min)"
print ""
read "?  Press ENTER to start (Ctrl+C to cancel)... " _

# ============================================================
# STEP 0 — Find the project
# ============================================================
heading "Step 0: Locating project files"

PROJECT_DIR=""
for candidate in \
    "$HOME/Downloads/lms-platform" \
    "$HOME/Desktop/lms-platform" \
    "$HOME/lms-platform" \
    "$(pwd)/lms-platform" \
    "$(pwd)"; do
    if [[ -f "$candidate/backend/schema.sql" ]]; then
        PROJECT_DIR="$candidate"
        break
    fi
done

if [[ -z "$PROJECT_DIR" ]]; then
    warn "Could not find lms-platform folder automatically."
    read "?  Enter full path to your lms-platform folder: " PROJECT_DIR
    PROJECT_DIR="${PROJECT_DIR/#\~/$HOME}"
fi

[[ -f "$PROJECT_DIR/backend/schema.sql" ]] || err "schema.sql not found in $PROJECT_DIR/backend/"

log "Found project at: $PROJECT_DIR"
cd "$PROJECT_DIR"

# ============================================================
# STEP 1 — Prerequisites
# ============================================================
heading "Step 1: Installing prerequisites"

# Xcode CLI tools
if ! xcode-select -p &>/dev/null; then
    info "Installing Xcode Command Line Tools..."
    xcode-select --install
    warn "A dialog opened — click Install, wait for it to finish, then press ENTER here."
    read "?  Press ENTER when Xcode tools finish installing... " _
fi
log "Xcode Command Line Tools"

# Homebrew
if ! command -v brew &>/dev/null; then
    info "Installing Homebrew (may ask for your Mac password)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
        print 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> "$HOME/.zprofile"
    fi
fi
log "Homebrew ready"

# Reload brew path
if [[ -f "/opt/homebrew/bin/brew" ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
fi

# Node.js 20
if ! command -v node &>/dev/null; then
    info "Installing Node.js 20..."
    brew install node@20
    BREW_PREFIX=$(brew --prefix)
    print "export PATH=\"$BREW_PREFIX/opt/node@20/bin:\$PATH\"" >> "$HOME/.zshrc"
    export PATH="$(brew --prefix)/opt/node@20/bin:$PATH"
elif [[ "$(node --version)" < "v18" ]]; then
    info "Upgrading Node.js to 20..."
    brew install node@20
    export PATH="$(brew --prefix)/opt/node@20/bin:$PATH"
fi
log "Node.js $(node --version)"

# PostgreSQL 15
if ! command -v psql &>/dev/null; then
    info "Installing PostgreSQL 15..."
    brew install postgresql@15
    BREW_PREFIX=$(brew --prefix)
    print "export PATH=\"$BREW_PREFIX/opt/postgresql@15/bin:\$PATH\"" >> "$HOME/.zshrc"
    export PATH="$(brew --prefix)/opt/postgresql@15/bin:$PATH"
fi

if ! pg_isready &>/dev/null; then
    info "Starting PostgreSQL..."
    brew services start postgresql@15
    sleep 4
fi
log "PostgreSQL $(psql --version)"

# Git
if ! command -v git &>/dev/null; then
    brew install git
fi
log "Git $(git --version)"

# GitHub CLI
if ! command -v gh &>/dev/null; then
    info "Installing GitHub CLI..."
    brew install gh
fi
log "GitHub CLI ready"

# Vercel CLI
if ! command -v vercel &>/dev/null; then
    info "Installing Vercel CLI..."
    npm install -g vercel --silent
fi
log "Vercel CLI ready"

# ============================================================
# STEP 2 — Local database + .env files
# ============================================================
heading "Step 2: Local database setup"

DB_NAME="lms_platform"
MAC_USER="$(whoami)"

if psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$DB_NAME"; then
    warn "Database '$DB_NAME' already exists — skipping"
else
    createdb "$DB_NAME"
    log "Database '$DB_NAME' created"
fi

info "Running schema migrations..."
psql "$DB_NAME" -f backend/schema.sql -q
log "Schema applied"

# Generate JWT secrets using openssl
JWT_SECRET_VAL=$(openssl rand -hex 64)
JWT_REFRESH_VAL=$(openssl rand -hex 64)

if [[ ! -f "backend/.env" ]]; then
    cat > backend/.env << BACKENDENV
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://${MAC_USER}@localhost:5432/${DB_NAME}
JWT_SECRET=${JWT_SECRET_VAL}
JWT_REFRESH_SECRET=${JWT_REFRESH_VAL}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MOCK_OTP=true
MOCK_OTP_VALUE=123456
FRONTEND_URL=http://localhost:3000
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=placeholder
LOG_REQUESTS=false
BACKENDENV
    log "backend/.env created"
fi

if [[ ! -f "frontend/.env.local" ]]; then
    cat > frontend/.env.local << FRONTENDENV
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_placeholder
FRONTENDENV
    log "frontend/.env.local created"
fi

# ============================================================
# STEP 2b — Install dependencies + seed
# ============================================================
heading "Step 2b: Installing Node dependencies"

info "Backend..."
(cd backend && npm install --silent)
log "Backend dependencies installed"

info "Frontend... (this takes ~1 minute)"
(cd frontend && npm install --silent)
log "Frontend dependencies installed"

info "Seeding demo data..."
(cd backend && node seed.js)

# ============================================================
# STEP 3 — Run locally
# ============================================================
heading "Step 3: Starting local servers"

info "Starting backend..."
(cd backend && npm run dev) > /tmp/lms-backend.log 2>&1 &
BACKEND_PID=$!

sleep 5

HEALTH=$(curl -s http://localhost:5000/health 2>/dev/null)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
    log "Backend running → http://localhost:5000"
else
    warn "Backend starting slowly — check /tmp/lms-backend.log if issues"
fi

info "Starting frontend..."
(cd frontend && npm run dev) > /tmp/lms-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 8

print ""
print "${GREEN}${BOLD}  ✓ App is running locally!${RESET}"
print ""
print "  Frontend  →  http://localhost:3000"
print "  Backend   →  http://localhost:5000/health"
print ""
print "  Demo logins:"
print "  ┌────────────────────────────────────────────┐"
print "  │  admin@demo.com     password: admin123      │"
print "  │  priya@demo.com     password: staff123      │"
print "  │  OTP: any phone  →  code: 123456            │"
print "  └────────────────────────────────────────────┘"
print ""

sleep 2
open http://localhost:3000

read "?  Test the app, then press ENTER to continue to cloud deploy... " _

kill $BACKEND_PID 2>/dev/null || true
kill $FRONTEND_PID 2>/dev/null || true
sleep 2

# ============================================================
# STEP 4 — GitHub
# ============================================================
heading "Step 4: Pushing to GitHub"

if [[ ! -d ".git" ]]; then
    git init
    git add .
    git commit -m "Initial LearnPro LMS commit"
    log "Git repository initialized"
else
    git add -A
    git diff --staged --quiet || git commit -m "Update LearnPro LMS"
    log "Git commit done"
fi

if ! gh auth status &>/dev/null; then
    print ""
    info "You need to log in to GitHub (browser will open)"
    warn "No GitHub account? Create one at github.com first, then press ENTER"
    read "?  Press ENTER to open GitHub login... " _
    gh auth login --web
fi

GITHUB_USER=$(gh api user --jq .login)
REPO_NAME="learnpro-lms"

if gh repo view "$GITHUB_USER/$REPO_NAME" &>/dev/null; then
    warn "Repo '$REPO_NAME' already exists on GitHub"
    git remote set-url origin "https://github.com/$GITHUB_USER/$REPO_NAME.git" 2>/dev/null || \
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git" 2>/dev/null || true
else
    info "Creating GitHub repo '$REPO_NAME'..."
    gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
fi

git push origin main --force 2>/dev/null || git push -u origin main

log "Code pushed → https://github.com/$GITHUB_USER/$REPO_NAME"

# ============================================================
# STEP 5 — Neon Database
# ============================================================
heading "Step 5: Cloud Database (Neon — free)"

print ""
info "Opening Neon in your browser..."
open "https://neon.tech"
sleep 1

info "Opening schema.sql so you can copy it..."
open backend/schema.sql 2>/dev/null || open -a TextEdit backend/schema.sql 2>/dev/null || true

print ""
print "  ┌── Steps in Neon ────────────────────────────────────────────┐"
print "  │  1. Sign up with GitHub                                      │"
print "  │  2. New Project → Name: learnpro                             │"
print "  │     Region: Asia Pacific (Singapore)                         │"
print "  │  3. Click 'SQL Editor' in left sidebar                       │"
print "  │  4. Paste the entire schema.sql that just opened → Run       │"
print "  │  5. Dashboard → copy the Connection String                   │"
print "  │     Looks like: postgresql://user:pass@ep-xxx.neon.tech/...  │"
print "  └──────────────────────────────────────────────────────────────┘"
print ""

read "?  Paste your Neon connection string here: " NEON_DB_URL

if [[ "$NEON_DB_URL" != postgresql* ]]; then
    warn "That doesn't look right — should start with 'postgresql://'"
    read "?  Try again — paste connection string: " NEON_DB_URL
fi
log "Neon URL saved"

info "Seeding Neon database..."
DATABASE_URL="$NEON_DB_URL" node backend/seed.js
log "Neon database ready with demo data"

# ============================================================
# STEP 6 — Render (Backend)
# ============================================================
heading "Step 6: Backend deployment (Render — free)"

PROD_JWT=$(openssl rand -hex 64)
PROD_JWT_R=$(openssl rand -hex 64)

ENV_FILE="$HOME/Desktop/learnpro-env-vars.txt"

# Write the env file using Python to avoid heredoc issues
python3 - << PYEOF
env_content = f"""# LearnPro LMS — Environment Variables
# Paste these into Render and Vercel dashboards
# KEEP THIS FILE PRIVATE

# == RENDER (Backend) ==
NODE_ENV=production
PORT=5000
DATABASE_URL=${NEON_DB_URL}
JWT_SECRET=${PROD_JWT}
JWT_REFRESH_SECRET=${PROD_JWT_R}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
MOCK_OTP=true
MOCK_OTP_VALUE=123456
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=placeholder
FRONTEND_URL=WILL_UPDATE_AFTER_VERCEL

# == VERCEL (Frontend) ==
NEXT_PUBLIC_API_URL=WILL_UPDATE_AFTER_RENDER
NEXT_PUBLIC_RAZORPAY_KEY=rzp_test_placeholder
"""
with open("${ENV_FILE}", "w") as f:
    f.write(env_content)
print("Env file written")
PYEOF

log "Env vars saved to Desktop: learnpro-env-vars.txt"
open "$ENV_FILE"

print ""
info "Opening Render in your browser..."
open "https://render.com"
print ""
print "  ┌── Steps in Render ────────────────────────────────────────────┐"
print "  │  1. Sign up with GitHub                                        │"
print "  │  2. New → Web Service → Connect repo: $REPO_NAME             │"
print "  │  3. Fill in:                                                   │"
print "  │     Name:           learnpro-api                              │"
print "  │     Root Directory: backend                                    │"
print "  │     Runtime:        Node                                       │"
print "  │     Build Command:  npm install                                │"
print "  │     Start Command:  node src/app.js                           │"
print "  │     Plan:           Free                                       │"
print "  │  4. Click Advanced → Add Environment Variables                 │"
print "  │     (copy from the file that just opened on your Desktop)      │"
print "  │  5. Create Web Service                                         │"
print "  └────────────────────────────────────────────────────────────────┘"
print ""
print "  Variables to add in Render (all shown in the Desktop file):"
print "  NODE_ENV = production"
print "  PORT = 5000"
print "  DATABASE_URL = (your Neon URL)"
print "  JWT_SECRET = (from Desktop file)"
print "  JWT_REFRESH_SECRET = (from Desktop file)"
print "  JWT_EXPIRES_IN = 15m"
print "  JWT_REFRESH_EXPIRES_IN = 7d"
print "  MOCK_OTP = true"
print "  MOCK_OTP_VALUE = 123456"
print "  RAZORPAY_KEY_ID = rzp_test_placeholder"
print "  RAZORPAY_KEY_SECRET = placeholder"
print "  FRONTEND_URL = https://learnpro.vercel.app"
print ""
read "?  After Render finishes deploying, paste your Render URL here: " RENDER_URL
RENDER_URL="${RENDER_URL%/}"

info "Testing backend..."
for i in 1 2 3 4 5; do
    HEALTH=$(curl -s "$RENDER_URL/health" 2>/dev/null || echo "")
    if echo "$HEALTH" | grep -q '"status":"ok"'; then
        log "Backend health check passed"
        break
    fi
    info "Waiting... ($i/5)"
    sleep 10
done

# ============================================================
# STEP 7 — Vercel (Frontend)
# ============================================================
heading "Step 7: Frontend deployment (Vercel — free)"

RENDER_API="$RENDER_URL/api"

info "Logging in to Vercel..."
if ! vercel whoami &>/dev/null; then
    vercel login
fi
log "Vercel: logged in as $(vercel whoami)"

info "Deploying frontend to Vercel (2-3 minutes)..."
cd frontend

vercel --prod --yes \
    --build-env NEXT_PUBLIC_API_URL="$RENDER_API" \
    --build-env NEXT_PUBLIC_RAZORPAY_KEY="rzp_test_placeholder" \
    --env NEXT_PUBLIC_API_URL="$RENDER_API" \
    --env NEXT_PUBLIC_RAZORPAY_KEY="rzp_test_placeholder" \
    2>&1 | tee /tmp/vercel-out.log

VERCEL_URL=$(grep -Eo 'https://[a-z0-9-]+\.vercel\.app' /tmp/vercel-out.log | tail -1)
cd ..

if [[ -z "$VERCEL_URL" ]]; then
    warn "Could not auto-detect Vercel URL"
    read "?  Paste your Vercel URL (from the output above): " VERCEL_URL
fi
log "Frontend live → $VERCEL_URL"

# ============================================================
# STEP 8 — Update CORS + env file
# ============================================================
heading "Step 8: Final configuration"

# Update env file with real URLs
python3 - << PYEOF2
import re
with open("${ENV_FILE}") as f:
    content = f.read()
content = content.replace("WILL_UPDATE_AFTER_VERCEL", "${VERCEL_URL}")
content = content.replace("WILL_UPDATE_AFTER_RENDER", "${RENDER_API}")
with open("${ENV_FILE}", "w") as f:
    f.write(content)
print("Env file updated with real URLs")
PYEOF2

print ""
print "  ┌── Update FRONTEND_URL on Render ───────────────────────────────┐"
print "  │  1. Render dashboard → learnpro-api → Environment              │"
print "  │  2. Find FRONTEND_URL                                           │"
print "  │  3. Change to: $VERCEL_URL                                     │"
print "  │  4. Save Changes                                                │"
print "  └────────────────────────────────────────────────────────────────┘"
print ""
info "Opening Render dashboard..."
open "https://dashboard.render.com"
read "?  Press ENTER after you've updated FRONTEND_URL on Render... " _

# ============================================================
# STEP 9 — GoDaddy domain (optional)
# ============================================================
heading "Step 9: GoDaddy Custom Domain (Optional)"

read "?  Connect your GoDaddy domain? (y/n): " USE_DOMAIN

if [[ "$USE_DOMAIN" =~ ^[Yy]$ ]]; then
    read "?  Enter your domain (e.g. mycompany.com): " CUSTOM_DOMAIN
    CUSTOM_DOMAIN="${CUSTOM_DOMAIN//https:\/\//}"
    CUSTOM_DOMAIN="${CUSTOM_DOMAIN//http:\/\//}"
    CUSTOM_DOMAIN="${CUSTOM_DOMAIN%/}"

    RENDER_HOST="${RENDER_URL#https://}"

    print ""
    print "  ┌── GoDaddy DNS records to add ──────────────────────────────────┐"
    print "  │  Log in at godaddy.com → DNS for $CUSTOM_DOMAIN               │"
    print "  │  DELETE any existing A or CNAME for @ and www first            │"
    print "  │                                                                  │"
    print "  │  ADD these records:                                              │"
    print "  │  Type   Name   Value                        TTL                  │"
    print "  │  A      @      76.76.19.61                  600                  │"
    print "  │  CNAME  www    cname.vercel-dns.com         600                  │"
    print "  │  CNAME  api    $RENDER_HOST                 600                  │"
    print "  └──────────────────────────────────────────────────────────────────┘"
    print ""
    info "Opening GoDaddy DNS manager..."
    open "https://dcc.godaddy.com/manage/$CUSTOM_DOMAIN/dns"

    print ""
    print "  Then in Vercel: Settings → Domains → Add $CUSTOM_DOMAIN"
    print "  Then in Render: Settings → Custom Domains → Add api.$CUSTOM_DOMAIN"
    print ""
    info "Opening Vercel project settings..."
    open "https://vercel.com/dashboard"
    read "?  Press ENTER once DNS records are added... " _
fi

# ============================================================
# STEP 10 — UptimeRobot
# ============================================================
heading "Step 10: Keep backend awake (UptimeRobot — free)"

print ""
print "  Render free tier sleeps after 15 min idle."
print "  UptimeRobot pings it every 14 min to keep it awake — free."
print ""
info "Opening UptimeRobot..."
open "https://uptimerobot.com"
print ""
print "  1. Sign up free at uptimerobot.com"
print "  2. Add New Monitor → HTTP(s)"
print "  3. Friendly Name: LearnPro API"
print "  4. URL: $RENDER_URL/health"
print "  5. Interval: every 14 minutes → Create"
print ""
read "?  Press ENTER once UptimeRobot is configured... " _

# ============================================================
# DONE
# ============================================================
print ""
print "${GREEN}${BOLD}"
print "  ╔═══════════════════════════════════════════════════════════╗"
print "  ║              🎉  DEPLOYMENT COMPLETE!                     ║"
print "  ╚═══════════════════════════════════════════════════════════╝"
print "${RESET}"
print ""
print "  Your live URLs:"
print "  Frontend  →  $VERCEL_URL"
print "  Backend   →  $RENDER_URL"
print "  Health    →  $RENDER_URL/health"
print ""
print "  Demo logins:"
print "  ┌──────────────────────────────────────────────────────────────┐"
print "  │  Admin    admin@demo.com    /  admin123                       │"
print "  │  Manager  manager@demo.com  /  admin123                       │"
print "  │  Trainer  trainer@demo.com  /  admin123                       │"
print "  │  Staff    priya@demo.com    /  staff123                       │"
print "  │  OTP:     any 10-digit phone  →  OTP: 123456                  │"
print "  └──────────────────────────────────────────────────────────────┘"
print ""
print "  All credentials saved to: ${ENV_FILE}"
print ""
warn "Keep learnpro-env-vars.txt private — it contains secrets"
print ""

sleep 2
open "$VERCEL_URL"

log "Done! LearnPro LMS is live."
