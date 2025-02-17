import { WebSocket, WebSocketServer } from 'ws';
import { StreamManager } from './stream-manager';
import { config } from './config';
import { StreamMetadata } from './types';
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const frontendUrl = process.env.FRONTEND_URL;
const backendUrl = process.env.BACKEND_URL;
const port = process.env.PORT;

let streamManager: StreamManager;

try {
  streamManager = new StreamManager();
} catch (error) {
  console.error('Failed to initialize StreamManager:', error);
  process.exit(1);
}

// Express server for serving HLS files
const app = express();
app.use(cors({
  origin: "*",
}));

// Serve HLS files
app.use('/hls', express.static(path.join(__dirname, '..', 'hls')));

// Serve recording files with proper MIME type
app.use('/recordings', (req, res, next) => {
  if (req.path.endsWith('.webm')) {
    res.set('Content-Type', 'audio/webm');
  }
  express.static(path.join(__dirname, '..', 'recordings'))(req, res, next);
});

// Start HTTP server
// app.listen(port, () => {
//   console.log(`HTTP server running on port ${port}`);
// });
const server = http.createServer(app); 
server.listen(port, () => {
  console.log(`HTTP server running on port ${port}`);
})

// WebSocket server
// const wss = new WebSocketServer({ port: config.port });
// WebSocket Server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: WebSocket) => {
  const clientId = `client-${Date.now()}`;
  let streamMetadata: StreamMetadata;
  let shouldRecord = false; // Default recording preference

  console.log(`Client connected: ${clientId}`);

  // Wait for recording preference before creating stream
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'recording-preference') {
        shouldRecord = message.shouldRecord;
        
        // Create stream with recording preference
        streamMetadata = streamManager.createStream(clientId, shouldRecord);
        
        const hlsUrl = `${backendUrl}/hls/${streamMetadata.id}/audio.m3u8`;
        const recordingUrl = shouldRecord ? `${backendUrl}/recordings/${streamMetadata.id}.webm` : null;
        const playerUrl = `${frontendUrl}/player/${streamMetadata.id}`;
        const recordingPlayerUrl = shouldRecord ? `${playerUrl}?type=recording` : null;
        
        ws.send(JSON.stringify({ 
          type: 'stream-created', 
          streamId: streamMetadata.id,
          hlsUrl,
          recordingUrl,
          playerUrl,
          recordingPlayerUrl
        }));
        
        // Set up the audio data handler
        ws.on('message', (audioData: Buffer) => {
          try {
            streamManager.writeData(streamMetadata.id, audioData);
          } catch (error) {
            console.error(`Error processing stream data: ${error}`);
          }
        });
      } else if (streamMetadata) {
        // Handle audio data
        streamManager.writeData(streamMetadata.id, data);
      }
    } catch (error) {
      console.error(`Error processing message: ${error}`);
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