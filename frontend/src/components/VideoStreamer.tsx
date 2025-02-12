import React, { useRef, useState, useCallback } from 'react';

interface VideoStreamerProps {
  wsUrl: string;
  onError?: (error: Error) => void;
}

const VideoStreamer: React.FC<VideoStreamerProps> = ({ wsUrl, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;

      // Show preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize WebSocket
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        // Create MediaRecorder once WebSocket is connected
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9,opus',
          videoBitsPerSecond: 2500000,
          audioBitsPerSecond: 128000
        });

        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0 && websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(event.data);
          }
        };

        mediaRecorder.start(100); // Send chunks every 100ms for lower latency
        setIsRecording(true);
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

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsRecording(false);
  }, []);

  return (
    <div className="video-streamer">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-2xl border rounded-lg"
      />
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
    </div>
  );
};

export default VideoStreamer;