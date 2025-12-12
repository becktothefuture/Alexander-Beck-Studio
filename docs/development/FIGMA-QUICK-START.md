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

Already configured in `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "TalkToFigma": {
      "command": "bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"]
    }
  }
}
```

**Restart Cursor** if you just added this configuration.

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

---

## Daily Workflow

### Step 1: Start WebSocket Server

```bash
bunx cursor-talk-to-figma-socket
```

Keep this terminal open. The socket server runs on **port 3055**.

### Step 2: Open Figma & Run Plugin

1. Open Figma Desktop App
2. Open your design file
3. **Plugins** → **Development** → **Cursor MCP Plugin**
4. Click **Connect**

### Step 3: Note the Channel Name ⚠️ CRITICAL

**The plugin auto-generates a random channel name.** Look for:

```
Connected to server in channel: vstd5h8g
                                ^^^^^^^^
                                THIS IS YOUR CHANNEL
```

> ⚠️ **Do NOT assume the channel is "default"!** Each session generates a unique channel name.

### Step 4: Join the Channel in Cursor

Tell Cursor the **exact channel name** from the plugin:

```
Join Figma channel "vstd5h8g"
```

(Replace `vstd5h8g` with your actual channel name)

### Step 5: Verify Connection

```
Get document info from Figma
```

If this works, you're connected!

---

## Common Commands

### Reading Designs
- `Get document info from Figma`
- `Read my design` (reads current selection)
- `Get node info for [node-id]`
- `Scan all text nodes in the selected frame`

### Creating Elements
- `Create a frame at (0, 0) with size 1200x800 named "Container"`
- `Create a rectangle at (100, 100) with size 200x150`
- `Create text "Hello World" at (50, 50)`

### Modifying Elements
- `Set fill color of node [node-id] to red` (uses RGBA 0-1 values)
- `Set text content of [node-id] to "New Text"`
- `Move node [node-id] to position (200, 200)`

### Batch Operations
- `Scan all text nodes and update from this document: [paste content]`
- `Replace text in multiple nodes at once`

---

## Troubleshooting

### "Request to Figma timed out"

**Cause:** Wrong channel name or plugin disconnected

**Fix:**
1. Check Figma plugin UI - is it showing "Connected"?
2. **Read the channel name from the plugin UI**
3. Join that exact channel: `Join Figma channel "[channel-from-plugin]"`

### "Not connected"

**Cause:** MCP server not connected to WebSocket

**Fix:**
1. Check WebSocket server: `lsof -i :3055`
2. If not running: `bunx cursor-talk-to-figma-socket`
3. Retry the command

### WebSocket server won't start?

- Check if port 3055 is in use: `lsof -i :3055`
- Kill existing process: `lsof -ti:3055 | xargs kill -9`
- Restart: `bunx cursor-talk-to-figma-socket`

### Plugin can't connect?

- Verify WebSocket server is running
- Check that port shows 3055 in plugin
- For Windows/WSL, may need hostname "0.0.0.0" configuration

---

## Two MCP Systems

You have access to two Figma MCP systems:

| MCP | Tools | Requires WebSocket |
|-----|-------|-------------------|
| **TalkToFigma** (`mcp_TalkToFigma_*`) | Read/Write - Full control | Yes |
| **Figma Desktop** (`mcp_figma-desktop_*`) | Read-only - Quick inspection | No |

Use **Figma Desktop** for quick reads without WebSocket setup.
Use **TalkToFigma** for any modifications or batch operations.

---

## Global Workflow Documentation

Comprehensive workflow guides are available at:
- `~/.cursor/rules/figma-cursor-rules.md` — Connection and operation rules
- `~/.cursor/rules/figma-knowledge.md` — Complete tool reference
- `~/.cursor/figma-workflows/` — Workflow templates (text sync, etc.)

---

## Next Steps

- Read [Full Setup Guide](./FIGMA-MCP-SETUP.md) for detailed documentation
- Explore [Available MCP Tools](./FIGMA-MCP-SETUP.md#available-mcp-tools)
- Check [Best Practices](./FIGMA-MCP-SETUP.md#best-practices-from-official-documentation)

---

**Need Help?** See [FIGMA-MCP-SETUP.md](./FIGMA-MCP-SETUP.md) for comprehensive documentation.
