# Scripts Directory

Utility scripts for the Alexander Beck Studio Website project.

## Available Scripts

### `figma-websocket-server.js`

WebSocket server for Figma MCP integration. Bridges communication between Cursor AI and Figma plugin.

**Usage:**
```bash
npm run figma:socket
```

**Configuration:**
- Default port: `8765` (set via `FIGMA_SOCKET_PORT` env var)
- Default hostname: `localhost` (set via `FIGMA_SOCKET_HOST` env var)
- For Windows/WSL: Uncomment `hostname: "0.0.0.0"` in the script

**Requirements:**
- Node.js with `ws` package installed (`npm install`)
- Figma plugin installed and running
- Cursor MCP server configured

See [`../docs/development/FIGMA-MCP-SETUP.md`](../docs/development/FIGMA-MCP-SETUP.md) for complete setup instructions.

