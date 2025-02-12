import { WebSocket, WebSocketServer } from 'ws';
import { StreamManager } from './stream-manager';
import { config } from './config';
import { StreamMetadata } from './types';

let streamManager: StreamManager;

try {
  streamManager = new StreamManager();
} catch (error) {
  console.error('Failed to initialize StreamManager:', error);
  process.exit(1);
}

const wss = new WebSocketServer({ port: config.port });

wss.on('connection', (ws: WebSocket) => {
  const clientId = `client-${Date.now()}`;
  let streamMetadata: StreamMetadata;

  console.log(`Client connected: ${clientId}`);

  try {
    streamMetadata = streamManager.createStream(clientId);
    
    const rtmpUrl = `rtmp://${config.rtmpServer}:${config.rtmpPort}/live/${streamMetadata.id}`;
    ws.send(JSON.stringify({ 
      type: 'stream-created', 
      streamId: streamMetadata.id,
      rtmpUrl: rtmpUrl
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