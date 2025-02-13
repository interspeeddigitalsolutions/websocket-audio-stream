import { WebSocket, WebSocketServer } from 'ws';
import { StreamManager } from './stream-manager';
import { config } from './config';
import { StreamMetadata } from './types';
import express from 'express';
import path from 'path';
import cors from 'cors';

let streamManager: StreamManager;

try {
  streamManager = new StreamManager();
} catch (error) {
  console.error('Failed to initialize StreamManager:', error);
  process.exit(1);
}

// Express server for serving HLS files
const app = express();
app.use(cors());

// Serve HLS files
app.use('/hls', express.static(path.join(__dirname, '..', 'hls')));

// Start HTTP server
const HTTP_PORT = 3001;
app.listen(HTTP_PORT, () => {
  console.log(`HTTP server running on port ${HTTP_PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ port: config.port });

wss.on('connection', (ws: WebSocket) => {
  const clientId = `client-${Date.now()}`;
  let streamMetadata: StreamMetadata;

  console.log(`Client connected: ${clientId}`);

  try {
    streamMetadata = streamManager.createStream(clientId);
    
    const hlsUrl = `http://localhost:${HTTP_PORT}/hls/${streamMetadata.id}/audio.m3u8`;
    const playerUrl = `http://localhost:5173/player/${streamMetadata.id}`;
    ws.send(JSON.stringify({ 
      type: 'stream-created', 
      streamId: streamMetadata.id,
      hlsUrl,
      playerUrl
    }));

  } catch (error) {
    console.error('Failed to create stream:', error);
    ws.close();
    return;
  }

  ws.on('message', (data: Buffer) => {
    try {
      streamManager.writeData(streamMetadata.id, data);
    } catch (error) {
      console.error(`Error processing stream data: ${error}`);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    streamManager.removeStream(streamMetadata.id);
  });

  ws.on('error', (error: Error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    streamManager.removeStream(streamMetadata.id);
  });
});