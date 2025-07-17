#!/bin/bash

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Run the MSTR test
echo "Running MSTR ticker test..."
echo "Make sure the Next.js app is running on http://localhost:3000"
echo ""

# Compile and run the TypeScript test
npx tsx test/mstr-test.ts