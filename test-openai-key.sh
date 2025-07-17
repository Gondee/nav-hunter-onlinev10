#!/bin/bash

# Test OpenAI API key directly
API_KEY="sk-proj-V0Nx0PPFSpY0dBh2K-ilZWpEXz7VtkfsGCWOvv3vnNXdiENEi8o6qUkk0cVDzWUD2QcouKv--bT3aBlbkFJXNtz00JVeiF9oWgzBPEbkEhb8FKy6KaA2qXINvKNWNwGj7qq-ltmzv2NI79f6Fy2_5euht3yAA"

echo "Testing OpenAI API key directly with curl..."
echo ""

curl -s https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 10
  }' | jq -r '.error // .choices[0].message.content // .'