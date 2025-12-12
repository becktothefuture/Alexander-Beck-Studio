# Figma MCP Quick Start

**Get up and running in 5 minutes**

## Prerequisites Check

```bash
# 1. Check if Bun is installed
bun --version
# If not: curl -fsSL https://bun.sh/install | bash

# 2. Install dependencies
npm install
```

## Setup (One-Time)

### 1. MCP Server Configuration ✅

Already configured! The MCP server is set up in Cursor's settings.

**Restart Cursor** if you just installed Bun.

### 2. Install Figma Plugin

```bash
# Clone the repository (one-time)
cd ~/Downloads  # or your preferred location
git clone https://github.com/grab/cursor-talk-to-figma-mcp.git
cd cursor-talk-to-figma-mcp
```

Then in Figma:
1. **Plugins** → **Development** → **New Plugin**
2. Choose **"Link existing plugin"**
3. Select: `cursor-talk-to-figma-mcp/src/cursor_mcp_plugin/manifest.json`
4. Plugin appears in **Plugins** → **Development**

## Daily Workflow

### Step 1: Start WebSocket Server

```bash
npm run figma:socket
```

Keep this terminal open. The socket server will start and listen on port 8765.

**Note:** The command uses `bunx` which requires Bun to be installed. If you see connection errors, ensure Bun is in your PATH:
```bash
export PATH="$HOME/.bun/bin:$PATH"
```

### Step 2: Open Figma & Run Plugin

1. Open Figma Desktop App
2. Open your design file
3. **Plugins** → **Development** → **Cursor MCP Plugin**

### Step 3: Connect in Cursor

In Cursor chat, type:
```
Join channel "default" in Figma
```

### Step 4: Start Using!

Try these commands in Cursor:

```
Get document info from Figma
```

```
Read my design and explain the layout
```

```
Get current selection in Figma
```

```
Create a rectangle at (100, 100) with size 200x150 named "Header"
```

---

## Common Commands

### Reading Designs
- `Get document info from Figma`
- `Read my design` (reads current selection)
- `Get node info for [node-id]`

### Creating Elements
- `Create a frame at (0, 0) with size 1200x800 named "Container"`
- `Create a rectangle at (100, 100) with size 200x150`
- `Create text "Hello World" at (50, 50)`

### Modifying Elements
- `Set fill color of selected node to rgba(255, 0, 0, 1)`
- `Set text content of [node-id] to "New Text"`
- `Move node [node-id] to position (200, 200)`

### Batch Operations
- `Scan all text nodes and replace "Old" with "New"`
- `Get all annotations in the document`

---

## Troubleshooting

**WebSocket server won't start?**
- Check if port 8765 is in use: `lsof -i :8765`
- Change port: `FIGMA_SOCKET_PORT=8766 npm run figma:socket`

**Plugin can't connect?**
- Verify WebSocket server is running
- Check firewall settings
- For Windows/WSL, edit `scripts/figma-websocket-server.js` and uncomment `hostname: "0.0.0.0"`

**Commands not working?**
- Ensure plugin is running in Figma
- Verify channel is joined (`join_channel` command)
- Check WebSocket server logs for errors

---

## Next Steps

- Read [Full Setup Guide](./FIGMA-MCP-SETUP.md) for detailed documentation
- Explore [Available MCP Tools](./FIGMA-MCP-SETUP.md#available-mcp-tools)
- Check [Best Practices](./FIGMA-MCP-SETUP.md#best-practices-from-official-documentation)

---

**Need Help?** See [FIGMA-MCP-SETUP.md](./FIGMA-MCP-SETUP.md) for comprehensive documentation.

