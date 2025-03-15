import { WebSocketServer } from 'ws';
import { StreamManager } from './stream-manager';
import { config } from './config';
import { StreamMetadata } from './types';
import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

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

// API routes
app.get('/api/generate-stream-id', (req, res) => {
  try {
    // Generate a unique stream ID
    const streamId = `stream-${uuidv4()}`;
    
    // Generate player URL
    const playerUrl = `${frontendUrl}/player/${streamId}`;
    
    // Return the stream ID and player URL as JSON
    res.json({ 
      streamId,
      playerUrl
    });
  } catch (error) {
    console.error('Error generating stream ID:', error);
    res.status(500).json({ error: 'Failed to generate stream ID' });
  }
});

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
const server = http.createServer(app); 
server.listen(port, () => {
  console.log(`HTTP server running on port ${port}`);
})

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const clientId = `client-${Date.now()}`;
  let streamMetadata: StreamMetadata;
  let shouldRecord = false; // Default recording preference
  let streamId: string;

  console.log(`Client connected: ${clientId}`);

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    // Check if the data is binary (audio data) or text (JSON control message)
    if (Buffer.isBuffer(data) && streamMetadata) {
      // Handle binary audio data
      try {
        streamManager.writeData(streamMetadata.id, data);
      } catch (error) {
        console.error(`Error processing audio data: ${error}`);
      }
    } else {
      // Handle JSON control messages
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'recording-preference') {
          shouldRecord = message.shouldRecord;
          streamId = message.streamId;
          
          // Create stream with recording preference
          streamMetadata = streamManager.createStream(clientId, shouldRecord, streamId);
          
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
        }
      } catch (error) {
        console.error(`Error processing JSON message: ${error}`);
      }
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    if (streamMetadata) {
      streamManager.removeStream(streamMetadata.id);
    }
  });

  ws.on('error', (error: Error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    if (streamMetadata) {
      streamManager.removeStream(streamMetadata.id);
    }
  });
});