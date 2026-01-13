#!/bin/bash
nohup npm run dev:api > api.log 2>&1 &
nohup npm run dev:vite > vite.log 2>&1 &
echo "Servers started"
