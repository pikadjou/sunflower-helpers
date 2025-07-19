# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

**Sunflower Helpers** is a Chrome extension (Manifest V3) built with TypeScript that monitors and captures API requests to the Sunflower Land game (sunflower-land.com). The extension intercepts API calls to `https://api.sunflower-land.com`, stores the data locally, and provides a popup interface for viewing and exporting captured requests.

## Architecture

### Core Components

- **Network Interceptor** (`src/content/network-interceptor.ts`): Dual interception system that overrides both `fetch()` and `XMLHttpRequest` on sunflower-land.com to capture API calls
- **Background Service Worker** (`src/background/background.ts`): Manages data storage, message routing, and automatic cleanup (maintains max 1000 entries)
- **Popup Interface** (`src/popup/popup.ts`): Data visualization with filtering, search, and JSON export functionality
- **Type System** (`src/types/extension.ts`): Comprehensive TypeScript interfaces for extension messaging and data structures

### Message Passing Architecture

Uses enum-based action system (`ExtensionAction`) for type-safe communication:
- Network Interceptor → Background: API data capture via `chrome.runtime.sendMessage`
- Background → Popup: Data retrieval and real-time updates
- Storage: `chrome.storage.local` for captured API data (auto-cleanup at 1000 entries)

### Build System

Webpack 5 with TypeScript compilation:
- **Multiple Entry Points**: Separate bundles for popup, background, content, and network-interceptor
- **Asset Copying**: Copy-webpack-plugin handles static files (HTML, CSS, icons, manifest)
- **TypeScript**: Strict configuration targeting ES2020 with Chrome extension types

## Development Commands

### Initial Setup
```bash
npm install                 # Install dependencies
```

### Build Commands
```bash
npm run build              # Production build
npm run dev                # Development build with watch mode
npm run clean              # Clean build output
npm run type-check         # Type checking without compilation
```

### Loading the Extension in Chrome
1. Run `npm run build` to compile TypeScript to JavaScript
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the repository folder
5. The extension will appear in the extensions bar

### Development Workflow
1. Make changes to TypeScript files in `src/`
2. Run `npm run dev` for automatic compilation on file changes
3. For popup changes: Close and reopen the popup
4. For content script changes: Reload the page
5. For background script changes: Reload the extension in `chrome://extensions/`

### TypeScript Development
- All source code is in TypeScript (`src/` directory)
- Compiled JavaScript is output to `dist/` directory
- Type definitions are in `src/types/extension.ts`
- Chrome extension types are provided by `@types/chrome`

## Architecture

### Key Implementation Details

- **Dual Interception Strategy**: Overrides both modern `fetch()` and legacy `XMLHttpRequest` for comprehensive API capture
- **Error Resilience**: Graceful handling of JSON parsing failures, network errors, and extension context unavailability
- **Content Security Policy Compliance**: No inline scripts, proper resource loading for Manifest V3
- **Type Safety**: Comprehensive TypeScript interfaces throughout the message passing system

### Development Workflow

1. Make TypeScript changes in `src/` directory
2. Run `npm run dev` for automatic compilation with watch mode
3. **For popup changes**: Close and reopen the extension popup
4. **For content script changes**: Reload the page where the script runs
5. **For background script changes**: Reload the extension in `chrome://extensions/`

### Domain-Specific Loading

- **Network Interceptor**: Only loads on `sunflower-land.com` domain via manifest content script matching
- **API Targeting**: Specifically captures requests to `https://api.sunflower-land.com`
- **Minimal Permissions**: Uses `activeTab`, `storage`, and host permissions only for Sunflower Land

### Data Flow & Storage

1. Network interceptor captures API calls on sunflower-land.com at `document_start`
2. Request/response data sent to background via message passing
3. Background stores in `chrome.storage.local` with automatic cleanup at 1000 entries
4. Popup retrieves data with real-time filtering and export capabilities

### Testing

Load extension in Chrome developer mode and:
1. Navigate to sunflower-land.com to trigger network interception
2. Open popup to view captured API requests
3. Test filtering by URL patterns and HTTP methods
4. Verify JSON export functionality