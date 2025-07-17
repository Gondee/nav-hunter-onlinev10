# NAV-Hunter Online - Product Requirements Document

## Executive Summary

NAV-Hunter Online is a web-based financial monitoring application built entirely in Next.js that tracks SEC filings in real-time, analyzes them using AI for cryptocurrency treasury-related events, and provides instant alerts to users. The application will migrate from a desktop Python/Flask application to a cloud-hosted Next.js/Vercel solution with server-side processing.

## Core Value Proposition

- **Shared Infrastructure**: Single WebSocket connection and OpenAI API usage for all users via Next.js API routes
- **Real-time Alerts**: Instant notifications for crypto treasury pivots and acquisitions
- **AI-Powered Analysis**: GPT-4 analysis of SEC filings for relevant events
- **Web Accessibility**: Access from any device with password protection
- **Cost Efficiency**: Reduced API costs through shared server-side resources

## Technical Architecture (Next.js Full-Stack)

### Frontend (Next.js Client-Side)
- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **Real-time Updates**: Socket.IO client or Server-Sent Events
- **Authentication**: Password-protected access via middleware
- **Responsive Design**: Desktop and mobile compatible
- **State Management**: Zustand or Redux Toolkit

### Backend (Next.js Server-Side)
- **API Routes**: Next.js Route Handlers for all backend logic
- **Real-time Data**: WebSocket client in Node.js for SEC feed
- **AI Processing**: OpenAI API integration via server routes
- **Broadcasting**: Socket.IO server or Pusher for real-time updates
- **State Management**: In-memory or Redis for recent alerts
- **Background Processing**: Node.js workers for continuous monitoring
- **Deployment**: Vercel with Edge Functions

## Feature Requirements

### 1. Authentication & Access Control
- Simple password authentication using Next.js middleware
- JWT or session-based authentication
- Environment variable for password configuration
- Protected API routes
- Redirect unauthorized users to login

### 2. Real-time Monitoring Dashboard
- **Alert Feed**: Live updates of crypto treasury events
  - Gold alerts for initial pivots (with TTS audio)
  - Blue alerts for routine updates (with ping sound)
  - Alert details: Company, ticker, confidence score, filing type, key quotes
  - Links to TradingView and SEC filing
  
- **Status Panel**: System health indicators
  - WebSocket connection status (Live/Error/Off)
  - Processing statistics (processed count, alerts count, uptime)
  - Visual indicators for data flow

- **AI Terminal**: Real-time AI analysis log
  - Shows processing status for each filing
  - Click for detailed request/response data
  - Color-coded by analysis type

### 3. Configuration Panel
- **Alert Filters**:
  - Confidence threshold slider (0-100%)
  - Form type selection (8-K, 10-Q, 10-K, S-1, 424B4, N-CSR, N-PORT, 497)
  
- **AI Configuration**:
  - Model selection (default: gpt-4o-mini)
  - Temperature control
  - System prompt editor with restore default option

### 4. Audio & Notifications
- **Audio Alerts**:
  - Text-to-speech for gold alerts using OpenAI TTS API
  - Ping sound for blue alerts
  - Click-to-enable audio (browser requirement)
  
- **Browser Notifications**:
  - Optional desktop notifications
  - Permission request flow

### 5. Testing Tools
- **Ticker Test**: Test specific company tickers via API route
- **Replay Mode**: Replay historical log files (admin only)

## Next.js API Architecture

### API Routes Structure
```
app/api/
├── auth/
│   ├── login/route.ts      # Password authentication
│   └── logout/route.ts     # Session cleanup
├── monitoring/
│   ├── start/route.ts      # Start monitoring
│   ├── stop/route.ts       # Stop monitoring
│   └── status/route.ts     # Get current status
├── alerts/
│   ├── stream/route.ts     # SSE or WebSocket endpoint
│   └── history/route.ts    # Get recent alerts
├── config/
│   ├── get/route.ts        # Get current config
│   └── update/route.ts     # Update configuration
├── test/
│   ├── ticker/route.ts     # Test specific ticker
│   └── replay/route.ts     # Replay log file
└── tts/
    └── generate/route.ts   # Generate TTS audio
```

### Background Services (Next.js)
- **SEC WebSocket Monitor**: Long-running connection managed by API route
- **Alert Processor**: Queue-based processing of incoming filings
- **AI Analyzer**: Batch processing with OpenAI API
- **State Manager**: In-memory or Redis-based state

## UI/UX Requirements

### Design System
- **Dark Theme**: Professional financial interface
  - Background: #1a1a1d (main), #2c2c34 (panels)
  - Text: #e1e1e1 (main), #8a8d93 (muted)
  - Accents: Blue (#4a90e2), Amber (#e89f3c), Red (#e74c3c), Green (#2ecc71)
  
- **Layout**:
  - Fixed AI terminal on right side (400px width)
  - Main content area with responsive panels
  - Fixed console log at bottom (200px height)
  - Responsive grid for mobile devices

### Component Specifications
1. **Alert Cards**:
   - Highlighted border for gold alerts
   - Company name, ticker, confidence score
   - Processing delay indicator
   - Expandable details section
   - Action links (TradingView, SEC)

2. **Status Indicators**:
   - Real-time WebSocket status with color coding
   - Animated "Receiving" state during data flow
   - Statistical counters with labels

3. **Modal Windows**:
   - AI analysis details modal
   - Blur background overlay
   - Scrollable content sections

## Server-Side Requirements (Next.js API Routes)

### WebSocket Management
- Single persistent connection to SEC real-time feed
- Managed by Next.js API route with proper cleanup
- Automatic reconnection logic
- Error handling and logging
- Message parsing and validation

### AI Processing Pipeline
1. Receive SEC filing notification via WebSocket
2. Fetch filing content via SEC API (server-side)
3. Prepare AI prompt with filing data
4. Send to OpenAI API for analysis
5. Parse JSON response and validate
6. Broadcast results to all connected clients
7. Generate TTS audio for gold alerts via API route

### Performance Requirements
- Process filings within 30 seconds of receipt
- Support 100+ concurrent client connections
- Maintain 99% uptime during market hours
- Handle API rate limits gracefully
- Use Edge Runtime where applicable

## Security Requirements
- Environment variables for all API keys (Vercel env)
- API route protection with authentication middleware
- HTTPS encryption for all connections
- Input validation and sanitization
- Rate limiting for API endpoints
- No storage of sensitive filing data
- CORS configuration for production domain only

## Deployment Strategy (Vercel)

### Configuration
- Automatic deployments from GitHub main branch
- Environment variables for:
  - `NEXTAUTH_SECRET`
  - `APP_PASSWORD`
  - `OPENAI_API_KEY`
  - `SEC_API_KEY`
  - `PUSHER_APP_ID` (if using Pusher for real-time)
- Edge functions for auth middleware
- Serverless functions for API routes
- Proper function timeouts for long-running processes

### Monitoring & Logging
- Vercel Analytics for performance
- Custom logging to Vercel logs
- Error tracking with Sentry
- Uptime monitoring with external service

## Success Metrics
- Alert latency: <30 seconds from filing to notification
- System uptime: >99% during market hours
- False positive rate: <5% for gold alerts
- User engagement: Daily active users
- API cost efficiency: Cost per alert <$0.10
- Page load time: <2 seconds
- Time to first alert: <5 seconds after login

## Migration Path
1. Set up Next.js project with authentication
2. Implement all UI components matching existing design
3. Create API routes for all backend functionality
4. Set up WebSocket monitoring in API route
5. Implement real-time broadcasting system
6. Deploy to Vercel with environment variables
7. Test end-to-end functionality
8. Migrate users with announcement
9. Deprecate Python desktop application

## Technical Decisions

### Real-time Updates
- **Option 1**: Socket.IO (client and server in Next.js)
- **Option 2**: Pusher or Ably (managed service)
- **Option 3**: Server-Sent Events (SSE)
- **Recommendation**: Start with SSE, migrate to Pusher if needed

### State Management
- **Client**: Zustand for simplicity
- **Server**: In-memory for MVP, Redis for scale

### Background Processing
- **Option 1**: Vercel Cron Jobs
- **Option 2**: External service (Railway/Render) for WebSocket
- **Recommendation**: Start with Vercel, use external if WebSocket limits hit