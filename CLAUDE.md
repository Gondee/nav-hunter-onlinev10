# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nav-Hunter-Online is a Next.js 15 application that tracks SEC filings in real-time, analyzes them with AI, and provides alerts. It's a full-stack application built entirely with Next.js, using API routes for backend functionality.

## Commands

### Development
```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npm run typecheck # Run TypeScript type checking
```

## Architecture

### Backend (API Routes)
Located in `app/api/`, the backend functionality includes:

- **SEC Integration** (`app/api/sec/`)
  - `/stream/route.ts`: WebSocket connection to SEC real-time feed
  - `/process-filing/route.ts`: Process individual SEC filings
  - `/replay/route.ts`: Replay historical data
  - `/test-ticker/route.ts`: Test specific ticker functionality

- **AI Analysis** (`app/api/ai/`)
  - `/analyze/route.ts`: OpenAI-powered filing analysis
  - Uses GPT for document analysis and insights

- **Real-time Communication**
  - Pusher for event broadcasting
  - Server-sent events for alert streaming
  - WebSocket connections for SEC feed

### Frontend
- **Next.js 15** with App Router (`app/` directory)
- **TypeScript** with strict mode
- **Tailwind CSS 3.x** for styling
- **Zustand** for state management
- **Path alias**: `@/*` maps to project root

### Key Components
- `components/dashboard/`: Dashboard UI components
- `components/alerts/`: Alert display components
- `components/status/`: Status monitoring panels
- `lib/realtime/`: Real-time communication utilities
- `lib/services/`: Service layer for API interactions

## Environment Variables

Required in `.env.local`:
```bash
SEC_API_KEY=your_sec_api_key
OPENAI_API_KEY=your_openai_api_key
PUSHER_APP_ID=your_pusher_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=your_pusher_cluster
```

## Current Implementation Status

### Completed ✅
- WebSocket connection to SEC feed
- API routes for monitoring control
- Real-time event broadcasting system
- Basic project structure
- TypeScript configuration
- Vercel deployment setup

### In Progress ⚠️
- Dashboard UI (minimal implementation)
- Alert system (structure exists, UI needs work)
- Configuration panels

### Not Implemented ❌
- User authentication system
- Data persistence layer
- Complete dashboard functionality
- Alert history and management

## Deployment

The app is configured for Vercel deployment:
- `vercel.json` specifies Next.js framework
- Environment variables must be set in Vercel dashboard
- Automatic deployments from main branch

## Important Notes

1. **Real-time Architecture**: Uses Pusher for broadcasting events between server and clients
2. **API Rate Limits**: Be mindful of SEC API rate limits when testing
3. **TypeScript**: Strict mode is enabled - ensure proper typing
4. **State Management**: Zustand store handles application state
5. **Testing**: Test files exist in `/test` directory for various scenarios