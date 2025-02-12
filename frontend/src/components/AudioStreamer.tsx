import React, { useRef, useState, useCallback } from 'react';
import './AudioStreamer.css';

interface AudioStreamerProps {
  wsUrl: string;
  onError?: (error: Error) => void;
}

const AudioStreamer: React.FC<AudioStreamerProps> = ({ wsUrl, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });
      
      streamRef.current = stream;
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(event.data);
          }
        };

        mediaRecorder.start(500); // Send chunks every 500ms for lower latency
        setIsRecording(true);
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'stream-created' && data.rtmpUrl) {
            setRtmpUrl(data.rtmpUrl);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(new Error('WebSocket error occurred'));
        stopRecording();
      };

    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }, [wsUrl, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (websocketRef.current) {
      websocketRef.current.close();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsRecording(false);
  }, []);

  return (
    <div className="audio-streamer">
      <div className="mt-4 flex gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-lg ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {isRecording ? 'Stop Streaming' : 'Start Streaming'}
        </button>
      </div>
      {rtmpUrl && (
        <div className="rtmp-url-container">
          <p>RTMP URL:</p>
          <div className="rtmp-url-box">
            <input
              type="text"
              value={rtmpUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(rtmpUrl);
                alert('RTMP URL copied to clipboard!');
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioStreamer;