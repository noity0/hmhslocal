#!/usr/bin/env bash

# OllamaNode API Test Script

API_BASE="http://localhost:3000/api"

echo "=========================================="
echo "1. List Installed Models (GET /api/tags)"
echo "=========================================="
curl -s "${API_BASE}/tags" | grep -o '"name":[^,]*' | head -n 5

echo -e "\n\n=========================================="
echo "2. Generate Completion (POST /api/generate)"
echo "=========================================="
curl -s "${API_BASE}/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.3:8b",
    "prompt": "Write a 2-line haiku about privacy in AI.",
    "stream": false
  }'

echo -e "\n\n=========================================="
echo "3. Chat Completion (POST /api/chat)"
echo "=========================================="
curl -s "${API_BASE}/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-r1:8b",
    "messages": [
      { "role": "system", "content": "You are a concise expert." },
      { "role": "user", "content": "What is the time complexity of binary search?" }
    ],
    "stream": false
  }'

echo -e "\n\nDone!"
