# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nav-Hunter-Online is a financial monitoring application that tracks SEC filings in real-time, analyzes them with AI, and provides alerts. It consists of:
- **Backend**: Python Flask server with WebSocket support for real-time monitoring
- **Frontend**: Next.js 15 application (currently default template)

## Commands

### Frontend Development (Next.js)
```bash
cd nav-hunter
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend Development (Flask)
```bash
python app.py    # Start Flask server on port 5001
```

## Architecture

### Backend (`app.py`)
- **WebSocket Monitoring**: Connects to SEC real-time feed using websocket-client
- **AI Analysis**: Uses OpenAI API for ChatGPT analysis and text-to-speech
- **Threading**: Background thread for WebSocket monitoring
- **Flask-SocketIO**: Enables real-time communication with frontend clients
- **Key Features**:
  - Real-time SEC filing monitoring
  - AI-powered document analysis
  - Configurable alert thresholds
  - Replay functionality for historical data

### Frontend (`nav-hunter/`)
- **Next.js 15** with App Router (`app/` directory)
- **TypeScript** with strict mode
- **Tailwind CSS v4** for styling
- **Path alias**: `@/*` maps to project root

## Important Notes

1. **API Keys**: Currently hardcoded in `app.py`. Move to environment variables:
   - OpenAI API key (line 15)
   - SEC API key (line 16)

2. **Missing Dependencies**: No Python dependency file exists. Create `requirements.txt`:
   ```
   flask
   flask-socketio
   gevent
   websocket-client
   openai
   ```

3. **Frontend-Backend Connection**: No integration code exists yet. The frontend will need to connect to the Flask-SocketIO server at `http://localhost:5001`.

4. **TypeScript Path Resolution**: Use `@/` prefix for imports from project root.

5. **WebSocket Events**: The backend emits various SocketIO events (`message`, `alert`, `status`) that the frontend should listen for.