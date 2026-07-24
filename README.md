# LevarG — Autonomous Web Security Testing Platform

LevarG is a professional web security testing and analysis platform with autonomous reconnaissance, fingerprinting, and vulnerability verification capabilities.

## Features

- **Auto-Hunter**: Fully automated multi-phase security analysis (recon → fingerprinting → discovery → verification)
- **Request Laboratory**: Manual HTTP request manipulation and replay with session integration
- **Built-in Browser**: Chromium instance for authenticated testing with automatic cookie capture
- **Session Management**: Scoped cookie/header persistence for authenticated workflows
- **Auth Flows**: Replayable login macros for automated authentication
- **Web Filter Analysis**: Detect and test CDN/protection filtering with encoding techniques
- **Stack Gap Analyzer**: Identify normalization, smuggling, and escalation vectors
- **Origin IP Detection**: Discover real origin IPs behind CDN/proxy layers
- **STRIDE Threat Modeling**: Built-in threat model generator from scan data
- **Security Arsenal**: Tool detection and installation manager (20+ security tools)
- **Resources Manager**: SecLists, Nuclei templates, fuzzing wordlists
- **HTTP History**: Complete request/response logging with filtering

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment (optional - for AI features)
cp .env.example .env
# Edit .env with your CF_AI_TOKEN and CF_ACCOUNT_ID (or use Ollama)

# Start the server
npm run dev

# Access the web interface
# Open http://localhost:3000 in your browser
```

## Environment Variables

- `CF_AI_TOKEN`: Cloudflare Workers AI token (for AI features)
- `CF_ACCOUNT_ID`: Cloudflare account ID (for AI features)
- `OLLAMA_URL`: Remote Ollama instance URL (alternative AI backend)
- `OLLAMA_MODEL`: Ollama model name (default: llama3.2)
- `APP_URL`: The URL where this app is hosted
- `LEVARG_BIND`: Network interface to bind (default: 127.0.0.1)
- `LEVARG_PORT`: Port to listen on (default: 3000)
- `LEVARG_API_KEY`: Optional API key for non-localhost access
- `LEVARG_CORS_ORIGINS`: Comma-separated list of allowed CORS origins
- `LEVARG_DATA_DIR`: Directory for database and browser profiles (default: current directory)

## Architecture

### Backend (Node.js/Express)
- **Server**: Express.js with Vite for frontend serving
- **Database**: SQLite with better-sqlite3 (file: `levarg.db`)
- **Browser**: Puppeteer with stealth plugin for headless Chrome
- **AI Integration**: Cloudflare Workers AI or Ollama for intelligent analysis

### Frontend (React + Vite)
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4 with custom cyber-security theme
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Key Modules

- `automation_engine.ts`: Auto-Hunter orchestration engine
- `waf_bypass_engine.ts`: Web filter detection and testing
- `stack_gap_analyzer.ts`: Mutation-based gap analysis
- `origin_ip_detector.ts`: Origin IP discovery behind CDN
- `session_vault.ts`: Session management with scope enforcement
- `auth_flow_vault.ts`: Replayable authentication flows
- `browser_manager.ts`: Built-in browser management
- `credential_vault.ts`: Secure credential storage per scope
- `tool_manager.ts`: Security tool detection and installation
- `seclists.ts`: Wordlist and payload management
- `payload_oven.ts`: AI-powered payload generation

## API Endpoints

### Core
- `GET /health` - Health check
- `GET /api/stats` - System statistics
- `GET /api/version` - Version information

### Scope Management
- `GET /api/scopes` - List scopes
- `POST /api/scopes` - Create scope
- `DELETE /api/scopes/:id` - Delete scope

### Automation
- `POST /api/automation/start` - Start automated hunt
- `GET /api/automation/jobs` - List jobs
- `GET /api/automation/jobs/:id` - Get job details
- `GET /api/automation/jobs/:id/logs` - Get job logs

### Request Lab
- `POST /api/lab/proxy` - Execute HTTP request with session overlay
- `GET /api/history` - Get HTTP history
- `DELETE /api/history` - Clear history
- `POST /api/history/:requestId/replay` - Replay request

### Browser
- `GET /api/browser/status` - Browser status
- `POST /api/browser/launch` - Launch browser
- `POST /api/browser/close` - Close browser
- `POST /api/browser/navigate` - Navigate to URL
- `POST /api/browser/capture` - Capture page state
- `POST /api/browser/save-as-session` - Save as session

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session details
- `DELETE /api/sessions/:id` - Delete session

### Credentials
- `GET /api/credentials` - List credentials
- `POST /api/credentials` - Create credential
- `GET /api/credentials/:id` - Get credential
- `DELETE /api/credentials/:id` - Delete credential

### Auth Flows
- `GET /api/auth-flows` - List auth flows
- `POST /api/auth-flows` - Create auth flow
- `GET /api/auth-flows/:id` - Get auth flow
- `DELETE /api/auth-flows/:id` - Delete auth flow
- `POST /api/auth-flows/:id/run` - Execute auth flow
- `POST /api/auth-flows/detect` - Auto-detect login form

### Web Filter Analysis
- `POST /api/waf/fingerprint` - Fingerprint web filter
- `POST /api/waf/bypass` - Test bypass techniques
- `GET /api/waf/techniques` - List techniques
- `GET /api/waf/signatures` - List signatures

### Origin IP Detection
- `POST /api/origin-ip/detect` - Detect origin IP

### Stack Gap Analysis
- `POST /api/stack-gap/analyze` - Run gap analysis
- `GET /api/stack-gap/findings` - Get findings
- `DELETE /api/stack-gap/findings` - Clear findings

### STRIDE Threat Model
- `GET /api/stride` - List threats
- `POST /api/stride` - Create threat
- `DELETE /api/stride/:id` - Delete threat
- `POST /api/stride/analyze` - Auto-generate threats from scan
- `GET /api/stride/export` - Export threats
- `GET /api/stride/summary` - Get threat summary

### Tools & Resources
- `GET /api/tools/status` - Check tool installation status
- `POST /api/tools/install` - Install security tool
- `POST /api/tools/pdtm-install-all` - Batch install all tools
- `GET /api/resources/status` - Check resource status
- `POST /api/resources/install` - Install resource
- `GET /api/resources/browse` - Browse resource files

### Endpoint Headers
- `GET /api/endpoint-headers` - List header rules
- `POST /api/endpoint-headers` - Create header rule
- `DELETE /api/endpoint-headers/:id` - Delete header rule
- `POST /api/endpoint-headers/:id/toggle` - Toggle header rule
- `POST /api/endpoint-headers/match` - Match headers for URL

### Match & Replace
- `GET /api/match-replace` - List rules
- `POST /api/match-replace` - Create rule
- `POST /api/match-replace/:id/toggle` - Toggle rule
- `DELETE /api/match-replace/:id` - Delete rule
- `DELETE /api/match-replace` - Clear all rules

### Extension Bridge
- `GET /api/extension/tokens` - List pairing tokens
- `POST /api/extension/tokens` - Create pairing token
- `DELETE /api/extension/tokens/:id` - Delete token
- `POST /api/extension/cookies` - Ingest cookies from extension
- `GET /api/extension/download` - Download extension
- `GET /api/extension/bookmarklet` - Get bookmarklet code

## Security Notes

- All session and credential data is scoped to prevent cross-contamination
- Out-of-scope requests are automatically dropped from capture
- Built-in browser enforces scope boundaries before executing auth flows
- API key protection available for remote access
- CORS restrictions configurable via environment variables

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Type checking
npm run lint

# Clean build artifacts
npm run clean
```

## Mobile Support

LevarG includes Capacitor for mobile deployment:

```bash
# Build and sync to Android
npm run android:sync

# Build Android APK
npm run android:build

# Open Android Studio
npm run android:open
```

## License

Copyright © LEVELACE SENTINEL LLC. All rights reserved.
