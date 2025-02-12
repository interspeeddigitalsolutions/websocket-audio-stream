import path from 'path';

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 8083,
  rtmpServer: process.env.RTMP_SERVER || '103.191.179.241',
  rtmpPort: process.env.RTMP_PORT ? parseInt(process.env.RTMP_PORT) : 1935,
  // Update this path to where you extracted FFmpeg
  // ffmpegPath: process.env.FFMPEG_PATH || 'C:\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe'
};