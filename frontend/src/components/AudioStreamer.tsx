import React, { useRef, useState, useCallback, useEffect } from 'react';
import './AudioStreamer.css';

interface AudioStreamerProps {
  wsUrl: string;
  onError?: (error: Error) => void;
}

const AudioStreamer: React.FC<AudioStreamerProps> = ({ wsUrl, onError }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string>('');
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const urlInputRef = useRef<HTMLInputElement>(null);

  const drawVisualizer = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const barWidth = width / bufferLength * 2.5;
      let x = 0;

      canvasCtx.fillStyle = '#121212';
      canvasCtx.fillRect(0, 0, width, height);

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        const hue = (i / bufferLength) * 360;
        
        canvasCtx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }, []);

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

      // Set up audio analyzer
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
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

        mediaRecorder.start(500);
        setIsRecording(true);
        drawVisualizer();
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'stream-created' && data.playerUrl) {
            setPlayerUrl(data.playerUrl);
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
      console.error('Failed to start recording:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }, [wsUrl, onError, drawVisualizer]);

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

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
    // setRtmpUrl(''); // Clear the RTMP URL when stopping
    setPlayerUrl('');
  }, []);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return (
    <div className="record-audio-streamer">
      <div className="record-visualizer-container">
        <canvas ref={canvasRef} className="record-audio-visualizer" />
      </div>

      <button 
        className={`stream-button ${isRecording ? 'recording' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? 'Stop Streaming' : 'Start Streaming'}
      </button>

      {isRecording && playerUrl && (
        <div className="stream-info">
          <p>Share this link to let others listen to your stream:</p>
          <div className="player-url-box">
            <input
              ref={urlInputRef}
              type="text"
              value={playerUrl}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
              placeholder="Player URL will appear here..."
            />
            <button
              onClick={async () => {
                if (urlInputRef.current) {
                  urlInputRef.current.select();
                  urlInputRef.current.setSelectionRange(0, 99999);
                  
                  // Try the modern approach first
                  await navigator.clipboard.writeText(playerUrl).catch(() => {
                    // Fallback for iOS Safari
                    try {
                      document.execCommand('copy');
                    } catch (err) {
                      console.error('Copy failed:', err);
                    }
                  });
                  
                  setCopyButtonText('Copied');
                  setTimeout(() => {
                    setCopyButtonText('Copy');
                  }, 3000);
                }
              }}
            >
              {copyButtonText}
            </button>
          </div>
          <a href={playerUrl} target="_blank" rel="noopener noreferrer">
            Open in new tab
          </a>
        </div>
      )}
    </div>
  );
};

export default AudioStreamer;