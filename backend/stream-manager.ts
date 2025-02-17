import { ChildProcess, spawn } from 'child_process';
import { StreamMetadata } from './types';
import { config } from './config';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export class StreamManager {
  private activeStreams: Map<string, {
    process: ChildProcess;
    metadata: StreamMetadata;
  }>;

  constructor() {
    this.activeStreams = new Map();
  }

  createStream(clientId: string, shouldRecord: boolean = false): StreamMetadata {
    const streamId = `stream-${Date.now()}`;
    const HLS_FOLDER = path.join(__dirname, "..", "hls");
    const RECORDINGS_FOLDER = path.join(__dirname, "..", "recordings");

    // Ensure both directories exist
    [HLS_FOLDER, RECORDINGS_FOLDER].forEach(folder => {
      if (!fs.existsSync(folder)) fs.mkdirSync(folder);
    });

    const streamPath = `${HLS_FOLDER}/${streamId}`;
    const recordingPath = `${RECORDINGS_FOLDER}/${streamId}.webm`;
    fs.mkdirSync(streamPath, { recursive: true });

    const metadata: StreamMetadata = {
      id: streamId,
      startTime: new Date(),
      clientId,
      hlsPath: `${streamPath}/audio.m3u8`,
      recordingPath
    };

    // Recording is now controlled by the client preference

    let ffmpegCommand = [
      '-re',                          // Read input at native frame rate
      '-fflags', '+igndts',
      '-i', '-',                      // Read input from stdin
      // First output: HLS stream
      '-map', '0:a',                  // Map audio stream
      '-c:a', 'aac',
      '-ar', '48000',
      '-ac', '1',
      '-b:a', '128k',
      '-f', 'hls',
      '-hls_time', '1',
      '-hls_list_size', '2',
      '-hls_flags', 'delete_segments+append_list',
      `${streamPath}/audio.m3u8`
    ]

    if (shouldRecord) {
      ffmpegCommand.push(
        // Second output: WebM recording
        '-map', '0:a',                  // Map audio stream again
        '-c:a', 'libopus',             // Opus codec (excellent for audio)
        '-ar', '48000',                // High quality sample rate
        '-ac', '2',                    // Stereo
        '-b:a', '128k',                // Bitrate for good quality
        '-f', 'webm',                  // WebM container format
        recordingPath                  // Output WebM file
      );
    }

    const ffmpegProcess = spawn('ffmpeg', ffmpegCommand);

    // Improved error logging
    ffmpegProcess.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      console.log(`FFmpeg [${streamId}]:`, message);

      // Check for critical errors
      if (message.includes('Connection refused') ||
        message.includes('Failed to connect') ||
        message.includes('Invalid data')) {
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