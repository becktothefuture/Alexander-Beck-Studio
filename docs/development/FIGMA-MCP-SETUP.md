# Figma MCP Integration Setup

**Status:** ✅ Configured  
**Last Updated:** 2025-12-12  
**Source:** [cursor-talk-to-figma-mcp](https://github.com/grab/cursor-talk-to-figma-mcp)

## Overview

This project integrates Cursor AI with Figma using the Model Context Protocol (MCP), allowing Cursor to read designs and modify them programmatically. This enables AI-assisted design workflows where Cursor can analyze Figma files, extract design specifications, and even make design changes based on your instructions.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Cursor    │◄──MCP──►│  MCP Server  │◄──WS──►│   Figma     │
│     AI      │         │ (bunx)       │         │   Plugin    │
└─────────────┘         └──────────────┘         └─────────────┘
                               ▲
                               │
                        ┌──────┴──────┐
                        │  WebSocket  │
                        │   Server    │
                        │  (Node.js)  │
                        └─────────────┘
```

**Components:**
1. **MCP Server** - Runs via `bunx cursor-talk-to-figma-mcp@latest` (configured in Cursor)
2. **WebSocket Server** - Bridges MCP server ↔ Figma plugin (runs locally)
3. **Figma Plugin** - Installed in Figma, connects to WebSocket server

---

## Prerequisites

### 1. Install Bun

The MCP server requires Bun runtime:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1|iex"

# Verify installation
bun --version
```

### 2. Install WebSocket Dependency

```bash
npm install
```

This installs the `ws` package needed for the WebSocket server.

---

## Setup Steps

### Step 1: MCP Server Configuration ✅

The MCP server is already configured in Cursor's settings:
- **Location:** `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Configuration:**
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

**Note:** Restart Cursor after configuration changes.

### Step 2: Start WebSocket Server

The WebSocket server bridges communication between Cursor and Figma:

```bash
npm run figma:socket
```

**Default:** `localhost:8765`  
**For Windows/WSL:** Uncomment `hostname: "0.0.0.0"` in `scripts/figma-websocket-server.js`

You should see:
```
🚀 Figma WebSocket Server starting...
📡 Listening on localhost:8765

💡 Make sure to:
   1. Install the Figma plugin in Figma
   2. Run the plugin and join a channel
   3. Use Cursor to communicate with Figma
```

**Keep this terminal running** while using Figma integration.

### Step 3: Install Figma Plugin

1. Open Figma Desktop App
2. Go to **Plugins** → **Development** → **New Plugin**
3. Choose **"Link existing plugin"**
4. Navigate to the cloned repository:
   ```bash
   # Clone the repository (if not already done)
   git clone https://github.com/grab/cursor-talk-to-figma-mcp.git
   cd cursor-talk-to-figma-mcp
   ```
5. Select: `src/cursor_mcp_plugin/manifest.json`
6. The plugin should now appear in **Plugins** → **Development**

### Step 4: Connect Plugin to WebSocket

1. In Figma, run the **"Cursor MCP Plugin"** from your development plugins
2. Use the `join_channel` command in Cursor to connect:
   ```
   Join channel "default" in Figma
   ```
   Or specify a custom channel name.

---

## Usage Workflow

### Basic Workflow

1. **Start WebSocket Server** (Terminal 1):
   ```bash
   npm run figma:socket
   ```

2. **Open Figma** and run the Cursor MCP Plugin

3. **In Cursor**, use natural language to interact with Figma:
   ```
   Get information about the current Figma document
   ```
   ```
   Read my design and explain the layout
   ```
   ```
   Create a rectangle at position (100, 100) with size 200x150
   ```

### Best Practices (From Official Documentation)

#### 1. Always Join Channel First
Before sending commands, ensure the plugin is connected:
```
Join channel "default" in Figma
```

#### 2. Get Document Overview
Start with understanding the document structure:
```
Get document info from Figma
```

#### 3. Check Selection Before Modifications
```
Get current selection in Figma
```

#### 4. Use Appropriate Creation Tools
- `create_frame` for containers
- `create_rectangle` for basic shapes  
- `create_text` for text elements

#### 5. Verify Changes
After modifications, verify with:
```
Get node info for the element I just created
```

#### 6. Handle Large Designs
For large designs:
- Use chunking parameters in `scan_text_nodes`
- Monitor progress through WebSocket updates
- Implement appropriate error handling

#### 7. Batch Operations
Use batch operations when possible:
- `set_multiple_text_contents` for multiple text updates
- `set_multiple_annotations` for batch annotations
- `delete_multiple_nodes` for bulk deletions

---

## Available MCP Tools

### Document & Selection
- `get_document_info` - Get information about the current Figma document
- `get_selection` - Get information about the current selection
- `read_my_design` - Get detailed node information about the current selection
- `get_node_info` - Get detailed information about a specific node
- `get_nodes_info` - Get detailed information about multiple nodes
- `set_focus` - Set focus on a specific node
- `set_selections` - Set selection to multiple nodes

### Annotations
- `get_annotations` - Get all annotations in the document
- `set_annotation` - Create or update an annotation with markdown support
- `set_multiple_annotations` - Batch create/update annotations
- `scan_nodes_by_types` - Scan for nodes with specific types

### Creating Elements
- `create_rectangle` - Create a new rectangle
- `create_frame` - Create a new frame
- `create_text` - Create a new text node

### Modifying Text
- `scan_text_nodes` - Scan text nodes with intelligent chunking
- `set_text_content` - Set text content of a single node
- `set_multiple_text_contents` - Batch update multiple text nodes

### Auto Layout & Spacing
- `set_layout_mode` - Set layout mode (NONE, HORIZONTAL, VERTICAL)
- `set_padding` - Set padding values for auto-layout frames
- `set_axis_align` - Set primary and counter axis alignment
- `set_layout_sizing` - Set sizing modes (FIXED, HUG, FILL)
- `set_item_spacing` - Set distance between children

### Styling
- `set_fill_color` - Set fill color (RGBA)
- `set_stroke_color` - Set stroke color and weight
- `set_corner_radius` - Set corner radius

### Layout & Organization
- `move_node` - Move a node to a new position
- `resize_node` - Resize a node
- `delete_node` - Delete a node
- `delete_multiple_nodes` - Delete multiple nodes
- `clone_node` - Create a copy of a node

### Components & Styles
- `get_styles` - Get information about local styles
- `get_local_components` - Get information about local components
- `create_component_instance` - Create an instance of a component
- `get_instance_overrides` - Extract override properties
- `set_instance_overrides` - Apply overrides to instances

### Export & Advanced
- `export_node_as_image` - Export a node as an image (PNG, JPG, SVG, PDF)

### Connection Management
- `join_channel` - Join a specific channel to communicate with Figma

---

## MCP Prompts (Helper Strategies)

The MCP server includes helper prompts for complex tasks:

- `design_strategy` - Best practices for working with Figma designs
- `read_design_strategy` - Best practices for reading Figma designs
- `text_replacement_strategy` - Systematic approach for replacing text
- `annotation_conversion_strategy` - Convert manual annotations to native annotations
- `swap_overrides_instances` - Transfer overrides between component instances
- `reaction_to_connector_strategy` - Convert prototype reactions to connector lines

---

## Troubleshooting

### WebSocket Server Won't Start

**Port Already in Use:**
```bash
# Check what's using port 8765
lsof -i :8765

# Kill the process or change port
export FIGMA_SOCKET_PORT=8766
npm run figma:socket
```

### Plugin Can't Connect

1. Verify WebSocket server is running
2. Check firewall settings (port 8765)
3. For Windows/WSL, ensure `hostname: "0.0.0.0"` is uncommented

### MCP Server Not Found

1. Verify Bun is installed: `bun --version`
2. Test MCP server directly:
   ```bash
   bunx cursor-talk-to-figma-mcp@latest
   ```
3. Restart Cursor after configuration changes

### Commands Not Working

1. Ensure plugin is connected (check WebSocket server logs)
2. Verify channel is joined (`join_channel` command)
3. Check Figma plugin console for errors

---

## Example Use Cases

### 1. Extract Design Specifications
```
Read my design and extract all colors, fonts, and spacing values. 
Create a design token file based on this.
```

### 2. Generate Code from Design
```
Analyze the selected frame and generate HTML/CSS code that matches 
the design exactly.
```

### 3. Batch Text Updates
```
Scan all text nodes in the document and replace "Old Brand" with 
"New Brand" throughout.
```

### 4. Create Design System Documentation
```
Get all local components and styles, then create a markdown 
documentation file describing the design system.
```

### 5. Convert Prototypes to Connectors
```
Get all prototype reactions and convert them to FigJam connector 
lines for visual flow mapping.
```

---

## Integration with Project Workflow

### Design → Code Pipeline

1. **Design in Figma** - Create designs with proper component structure
2. **Extract Specs** - Use Cursor to read design and extract tokens
3. **Generate Code** - Cursor generates HTML/CSS matching the design
4. **Integrate** - Add to `source/` directory following project patterns
5. **Build** - Run `npm run build` to integrate into production

### Design System Sync

1. **Components in Figma** - Maintain component library
2. **Extract Components** - Use `get_local_components` to get component data
3. **Generate Documentation** - Cursor creates component docs
4. **Update Project** - Sync design tokens with `source/config/`

---

## Security & Privacy

- **Local Only** - WebSocket server runs locally (no external connections)
- **No Data Collection** - All communication stays on your machine
- **Channel Isolation** - Multiple channels prevent cross-contamination
- **Figma API** - Uses official Figma plugin API (no third-party services)

---

## Resources

- **Official Repository:** https://github.com/grab/cursor-talk-to-figma-mcp
- **MCP Documentation:** https://modelcontextprotocol.io
- **Figma Plugin API:** https://www.figma.com/plugin-docs/

---

## Quick Reference

```bash
# Start WebSocket server
npm run figma:socket

# Check if Bun is installed
bun --version

# Install dependencies
npm install

# Test MCP server directly
bunx cursor-talk-to-figma-mcp@latest
```

**Cursor MCP Config Location:**
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

---

**Last Updated:** 2025-12-12  
**Maintained By:** Alexander Beck Studio

