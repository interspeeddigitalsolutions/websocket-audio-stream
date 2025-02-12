import { ChildProcess, spawn } from 'child_process';
import { StreamMetadata } from './types';
import { config } from './config';

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

    // Updated FFmpeg command with error handling
    const ffmpegProcess = spawn('ffmpeg', [
      '-re',                          // Read input at native frame rate
      '-fflags', '+igndts',           
      '-i', '-',                      
      '-c:a', 'aac',                  
      '-ar', '48000',                 
      '-ac', '1',                     
      '-b:a', '128k',
      '-rtmp_buffer', '8192',         // Increase RTMP buffer
      '-rtmp_live', 'live',           // Specify RTMP live mode
      '-f', 'flv',                    
      // Use full server URL instead of localhost
      `rtmp://${config.rtmpServer}/live/${streamId}`
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