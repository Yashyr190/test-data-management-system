#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  TDMS — Test Data Management System
#  Full-stack startup: kills old processes, starts fresh
# ─────────────────────────────────────────────────────────────────
set -e

PYTHON=${PYTHON:-python3.11}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
DEMO_DIR="$SCRIPT_DIR/demo-app"
VENV_DIR="$BACKEND_DIR/venv"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  ████████╗██████╗ ███╗   ███╗███████╗"
  echo "     ██╔══╝██╔══██╗████╗ ████║██╔════╝"
  echo "     ██║   ██║  ██║██╔████╔██║███████╗"
  echo "     ██║   ██║  ██║██║╚██╔╝██║╚════██║"
  echo "     ██║   ██████╔╝██║ ╚═╝ ██║███████║"
  echo "     ╚═╝   ╚═════╝ ╚═╝     ╚═╝╚══════╝"
  echo -e "${NC}"
  echo -e "  ${BOLD}Test Data Management System${NC} ${BLUE}v1.0${NC}"
  echo ""
}

step() { echo -e "\n${BLUE}▶${NC} ${BOLD}$1${NC}"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "\n  ${RED}✗ ERROR:${NC} $1\n"; exit 1; }
info() { echo -e "  ${CYAN}ℹ${NC} $1"; }

# ── Cleanup on exit ────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""
DEMO_PID=""

cleanup() {
  echo -e "\n${YELLOW}${BOLD}Shutting down all services…${NC}"
  [ -n "$BACKEND_PID"  ] && kill "$BACKEND_PID"  2>/dev/null && ok "Backend stopped"
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && ok "Frontend stopped"
  [ -n "$DEMO_PID"     ] && kill "$DEMO_PID"     2>/dev/null && ok "Demo app stopped"
  echo -e "${GREEN}All services stopped. Goodbye!${NC}\n"
}
trap cleanup EXIT INT TERM

print_banner

# ── Step 0: Kill anything already on our ports ──────────────────
step "Killing any existing processes on ports 8000, 5173, 5174, 9000"

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    ok "Killed processes on port $port (PIDs: $pids)"
  else
    info "Port $port is already free"
  fi
}

kill_port 8000
kill_port 5173
kill_port 5174
kill_port 9000

# Also kill any stray uvicorn / vite / flask processes from previous runs
pkill -f "uvicorn main:app" 2>/dev/null && ok "Killed stray uvicorn" || true
pkill -f "vite"             2>/dev/null && ok "Killed stray vite"    || true
pkill -f "demo-app/app.py"  2>/dev/null && ok "Killed stray demo app" || true

sleep 1  # brief pause so ports are released

# ── Step 1: Check Python ───────────────────────────────────────
step "Checking Python"
if ! command -v "$PYTHON" &>/dev/null; then
  warn "python3.11 not found, falling back to python3"
  PYTHON=python3
  command -v "$PYTHON" &>/dev/null || fail "Python 3 not found. Install from https://python.org"
fi
ok "Using $($PYTHON --version 2>&1)"

# ── Step 2: Check Node ─────────────────────────────────────────
step "Checking Node.js"
command -v node &>/dev/null || fail "Node.js not found. Install from https://nodejs.org"
ok "Node $(node --version)"

# ── Step 3: Backend venv ───────────────────────────────────────
step "Python virtual environment"
if [ ! -d "$VENV_DIR" ]; then
  $PYTHON -m venv "$VENV_DIR"
  ok "Created venv at $VENV_DIR"
else
  ok "Existing venv found"
fi
source "$VENV_DIR/bin/activate"
ok "Activated venv"

# ── Step 4: Install backend deps ──────────────────────────────
step "Installing backend dependencies"
pip install --quiet --upgrade pip
pip install --quiet -r "$BACKEND_DIR/requirements.txt"
ok "Backend deps installed"

# Install Flask for demo app (lightweight, same venv)
pip install --quiet flask
ok "Flask installed for demo app"

# ── Step 5: Seed demo data ────────────────────────────────────
step "Demo database"
cd "$BACKEND_DIR"
if [ ! -f "tdms.db" ]; then
  $PYTHON demo/seed.py
  ok "Demo data seeded"
else
  ok "Database already exists (skipping seed — delete tdms.db to reseed)"
fi

# ── Step 6: Start FastAPI backend ─────────────────────────────
step "Starting FastAPI backend  (port 8000)"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
ok "Backend PID: $BACKEND_PID"

echo -n "  Waiting for API"
for i in {1..25}; do
  sleep 0.8
  echo -n "."
  if curl -sf http://localhost:8000/api/health &>/dev/null; then
    echo ""
    ok "API healthy at http://localhost:8000"
    break
  fi
  if [ $i -eq 25 ]; then
    echo ""
    warn "API not responding yet — may still be starting"
  fi
done

# ── Step 7: Start Demo App ────────────────────────────────────
step "Starting Demo Web App  (port 9000)"
cd "$DEMO_DIR"
$PYTHON app.py &
DEMO_PID=$!
ok "Demo app PID: $DEMO_PID"
sleep 1

if curl -sf http://localhost:9000 &>/dev/null; then
  ok "Demo app running at http://localhost:9000"
else
  warn "Demo app may still be starting at http://localhost:9000"
fi

# ── Step 8: Install & start frontend ──────────────────────────
cd "$FRONTEND_DIR"
step "Installing frontend dependencies"
if [ ! -d "node_modules" ]; then
  npm install --silent
  ok "Node modules installed"
else
  ok "Node modules already installed"
fi

step "Starting React frontend  (port 5173)"
npm run dev &
FRONTEND_PID=$!
ok "Frontend PID: $FRONTEND_PID"
sleep 2

# Detect actual port (vite may use 5174 if 5173 was briefly busy)
FRONTEND_PORT=5173
if ! curl -sf http://localhost:5173 &>/dev/null; then
  if curl -sf http://localhost:5174 &>/dev/null; then
    FRONTEND_PORT=5174
  fi
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║         TDMS is fully running! 🚀            ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}  ${BOLD}Dashboard${NC}   → ${CYAN}http://localhost:${FRONTEND_PORT}${NC}        ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  ${BOLD}API${NC}         → ${CYAN}http://localhost:8000${NC}          ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  ${BOLD}API Docs${NC}    → ${CYAN}http://localhost:8000/docs${NC}     ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  ${BOLD}Demo App${NC}    → ${CYAN}http://localhost:9000${NC}          ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}  ${YELLOW}Demo credentials:${NC}                            ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  testuser@example.com / SecurePass!123       ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}  admin@example.com    / AdminPass!456        ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║${NC}  💡 When running tests, enter:               ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}║${NC}     ${CYAN}http://localhost:9000${NC}  as the base URL  ${GREEN}${BOLD}║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Press ${BOLD}Ctrl+C${NC} to stop all services"
echo ""

wait $BACKEND_PID $FRONTEND_PID $DEMO_PID
