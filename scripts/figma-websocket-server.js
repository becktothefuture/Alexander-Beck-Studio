#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    FIGMA WEBSOCKET SERVER FOR MCP INTEGRATION               ║
// ║                        Alexander Beck Studio Website                          ║
// ║                    Based on cursor-talk-to-figma-mcp                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * WebSocket server that facilitates communication between the MCP server
 * and the Figma plugin. This must be running for Cursor to communicate with Figma.
 * 
 * Usage:
 *   npm run figma:socket
 *   or
 *   node scripts/figma-websocket-server.js
 * 
 * Default port: 8765
 * Default hostname: localhost (uncomment 0.0.0.0 for WSL/Windows)
 */

const WebSocket = require('ws');

const PORT = process.env.FIGMA_SOCKET_PORT || 8765;
const HOSTNAME = process.env.FIGMA_SOCKET_HOST || 'localhost';
// Uncomment for Windows/WSL support:
// const HOSTNAME = '0.0.0.0';

const wss = new WebSocket.Server({ 
  port: PORT,
  hostname: HOSTNAME
});

const channels = new Map();

console.log(`🚀 Figma WebSocket Server starting...`);
console.log(`📡 Listening on ${HOSTNAME}:${PORT}`);
console.log(`\n💡 Make sure to:`);
console.log(`   1. Install the Figma plugin in Figma`);
console.log(`   2. Run the plugin and join a channel`);
console.log(`   3. Use Cursor to communicate with Figma\n`);

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`✅ New connection from ${clientIp}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'join_channel') {
        const channelId = data.channelId || 'default';
        
        // Remove from previous channel if exists
        for (const [id, clients] of channels.entries()) {
          clients.delete(ws);
          if (clients.size === 0) {
            channels.delete(id);
          }
        }
        
        // Add to new channel
        if (!channels.has(channelId)) {
          channels.set(channelId, new Set());
        }
        channels.get(channelId).add(ws);
        
        console.log(`📢 Client joined channel: ${channelId} (${channels.get(channelId).size} clients)`);
        
        ws.send(JSON.stringify({
          type: 'joined_channel',
          channelId: channelId
        }));
      } else if (data.type === 'leave_channel') {
        for (const [id, clients] of channels.entries()) {
          if (clients.has(ws)) {
            clients.delete(ws);
            if (clients.size === 0) {
              channels.delete(id);
            }
            console.log(`👋 Client left channel: ${id}`);
          }
        }
      } else if (data.channelId) {
        // Broadcast to all clients in the channel
        const channelClients = channels.get(data.channelId);
        if (channelClients) {
          channelClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(message);
            }
          });
        }
      }
    } catch (error) {
      console.error(`❌ Error processing message:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    // Remove from all channels
    for (const [id, clients] of channels.entries()) {
      if (clients.has(ws)) {
        clients.delete(ws);
        if (clients.size === 0) {
          channels.delete(id);
        }
        console.log(`👋 Client disconnected from channel: ${id}`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error:`, error);
  });
});

wss.on('error', (error) => {
  console.error(`❌ Server error:`, error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down WebSocket server...');
  wss.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

