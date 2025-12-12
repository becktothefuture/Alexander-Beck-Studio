# Figma MCP Troubleshooting Guide

## Issue: Tools Not Available in Cursor AI

If Figma MCP tools are not appearing or working in Cursor:

### 1. Verify MCP Server is Running
Check if the MCP server process is active:
```bash
ps aux | grep cursor-talk-to-figma-mcp | grep -v grep
```

### 2. Verify WebSocket Server is Running
The WebSocket server must be running for communication:
```bash
npm run figma:socket
# Should start on port 8765 (or check plugin for actual port)
```

### 3. Check Plugin Port
The Figma plugin may use a different port (e.g., 3055). Ensure the WebSocket server matches:
- Plugin shows connection port in its UI
- WebSocket server should listen on that port

### 4. Restart Cursor
After MCP configuration changes:
1. Save the configuration file
2. Fully quit Cursor (not just close window)
3. Reopen Cursor
4. MCP tools should load on startup

### 5. Verify Configuration Location
Configuration should be at:
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

### 6. Check MCP Server Logs
The MCP server may output errors to Cursor's console. Check:
- Cursor's developer console (if available)
- Terminal where MCP server might be logging

### 7. Natural Language Commands
If tools aren't available as function calls, try using natural language in chat:
```
Create a rectangle at position (100, 100) with size 600x400, fill it with red color rgba(255, 0, 0, 1) in Figma
```

### 8. Channel Connection
Ensure you've joined a channel first:
```
Join channel "your-channel-name" in Figma
```

## Common Issues

### Port Mismatch
- Plugin shows one port (e.g., 3055)
- WebSocket server default is 8765
- Solution: Check plugin UI for actual port, or configure WebSocket server to match

### Tools Not Loading
- Configuration correct but tools don't appear
- Solution: Full Cursor restart required (quit completely, not just reload window)

### Connection Timeout
- WebSocket server not reachable
- Solution: Check firewall, ensure server is running, verify port matches

---

## Known Limitations

### Cannot Reparent Existing Nodes

**Status:** Confirmed limitation of TalkToFigma MCP (tested Dec 2025)

**Problem:** The MCP tools cannot move an existing element into a different parent (frame/group/section).

**Tools Tested:**

| Tool | Result |
|------|--------|
| `clone_node` | ❌ Creates sibling at same hierarchy level (no `parentId` param) |
| `move_node` | ❌ Only changes x,y coordinates, not parent |
| `create_*` + `parentId` | ⚠️ Only works for NEW elements |
| `appendChild` | ❌ Tool doesn't exist |
| `setParent` / `reparent` | ❌ Tool doesn't exist |

**Workarounds Evaluated:**

| Approach | Feasible? | Blocker |
|----------|-----------|---------|
| Clone into parent | ❌ | `clone_node` has no `parentId` parameter |
| Recreate with properties | ⚠️ Partial | Image/complex fills can't be transferred |
| Export → reimport | ❌ | No tool to insert exported images as fills |
| Convert to component | ❌ | No "convert to component" tool |

**Use Cases Affected:**
- "Frame selection" workflows
- Organizing/restructuring layer hierarchies
- Moving elements between frames programmatically

### Best Approach: Hybrid Workflow

For tasks requiring hierarchy changes, use a **hybrid Cursor + Figma workflow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  RECOMMENDED WORKFLOW FOR HIERARCHY OPERATIONS                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CURSOR: Create frames/containers at target positions        │
│     → create_frame with name, position, size                    │
│                                                                 │
│  2. FIGMA (manual): Drag existing elements into frames          │
│     → Layers panel drag-and-drop                                │
│     → Or use Cmd+Option+G to frame selection                    │
│                                                                 │
│  3. CURSOR: Continue with styling, text, annotations            │
│     → set_fill_color, set_text_content, etc.                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why this works:**
- Cursor excels at: creating elements, bulk text updates, styling, annotations
- Figma excels at: hierarchy manipulation, visual arrangement, component management
- Combining both gives you the best of both worlds

### Cannot Create Image Fills

**Status:** Confirmed limitation

The MCP can read image fills but cannot create them:
- `create_rectangle` only supports solid color fills
- No `set_image_fill` or `upload_image` tool exists
- Exported images (via `export_node_as_image`) return base64 but can't be re-inserted

**Workaround:** Add images manually in Figma, then use Cursor for other modifications.


