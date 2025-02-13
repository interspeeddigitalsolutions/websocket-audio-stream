import { ChildProcess, spawn } from 'child_process';
import { StreamMetadata } from './types';
import { config } from './config';
import * as path from 'path';
import * as fs from 'fs';

export class StreamManager {
  private activeStreams: Map<string, { 
    process: ChildProcess;
    metadata: StreamMetadata;
  }>;

  constructor() {
    this.activeStreams = new Map();
  }

  createStream(clientId: string): StreamMetadata {
    const streamId = `stream-${Date.now()}`;
    const metadata: StreamMetadata = {
      id: streamId,
      startTime: new Date(),
      clientId
    };

    const HLS_FOLDER = path.join(__dirname, "..", "hls");
    if (!fs.existsSync(HLS_FOLDER)) fs.mkdirSync(HLS_FOLDER);

    // Create streams directory if it doesn't exist
    const streamPath = `${HLS_FOLDER}/${streamId}`;
    spawn('mkdir', ['-p', streamPath]);
    const ffmpegProcess = spawn('ffmpeg', [
      '-re',                          
      '-re',                          // Read input at native frame rate
      '-fflags', '+igndts',           
      '-i', '-',                      // Read input from stdin
      '-c:a', 'aac',                  
      '-ar', '48000',                 
      '-ac', '1',                     
      '-b:a', '128k',
      '-f', 'hls',                    // HLS output format
      '-hls_time', '1',               // Duration of each segment
      '-hls_list_size', '2',          // Number of segments to keep in playlist
      '-hls_flags', 'delete_segments+append_list',  // Auto-delete old segments
      `${streamPath}/audio.m3u8`      // Output HLS playlist
    ]);

    // Improved error logging
    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      console.log(`FFmpeg [${streamId}]:`, message);
      
      // Check for critical errors
      if (message.includes('Connection refused') || message.includes('Failed to connect')) {
        console.error(`Critical streaming error for ${streamId}:`, message);
        this.removeStream(streamId);
      }
    });

    ffmpegProcess.on('error', (error: Error) => {
      console.error(`FFmpeg process error [${streamId}]:`, error);
      this.removeStream(streamId);
    });

    ffmpegProcess.on('exit', (code: number) => {
      console.log(`FFmpeg process exited [${streamId}] with code:`, code);
      this.removeStream(streamId);
    });

    this.activeStreams.set(streamId, {
      process: ffmpegProcess,
      metadata
    });

    return metadata;
  }

  writeData(streamId: string, data: Buffer): void {
    const stream = this.activeStreams.get(streamId);
    if (stream && stream.process?.stdin) {
      try {
        const result = stream.process.stdin.write(data);
        if (!result) {
          stream.process.stdin.once('drain', () => {
            // Resume writing when buffer is emptied
          });
        }
      } catch (error) {
        console.error(`Error writing to stream ${streamId}:`, error);
        this.removeStream(streamId);
      }
    }
  }

  removeStream(streamId: string): void {
    const stream = this.activeStreams.get(streamId);
    if (stream && stream.process) {
      try {
        if (stream.process.stdin) {
          stream.process.stdin.end();
        }
        stream.process.kill();  // Ensure the process is terminated
      } catch (error) {
        console.error(`Error closing stream ${streamId}:`, error);
      } finally {
        this.activeStreams.delete(streamId);
      }
    }
  }

  getStreamMetadata(streamId: string): StreamMetadata | undefined {
    return this.activeStreams.get(streamId)?.metadata;
  }
}