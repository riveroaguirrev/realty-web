#!/bin/bash

# Kill any processes using ports 3000 and 5173
lsof -i :3000 -t | xargs kill -9 2>/dev/null || true
lsof -i :5173 -t | xargs kill -9 2>/dev/null || true
sleep 2

set -a
source .env.local
set +a

# Ensure ports are set
export BACKEND_PORT=3000

npm run dev
