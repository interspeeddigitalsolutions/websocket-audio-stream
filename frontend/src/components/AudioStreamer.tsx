import React, { useRef, useState, useCallback, useEffect } from 'react';
import './AudioStreamer.css';
import podcastImage from '../assets/podcast.png';

interface AudioStreamerProps {
  wsUrl: string;
  onError?: (error: Error) => void;
}

const AudioStreamer: React.FC<AudioStreamerProps> = ({ wsUrl, onError }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [shouldRecord, setShouldRecord] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string>('');
  const [recordingPlayerUrl, setRecordingPlayerUrl] = useState<string>('');
  const recordingInputRef = useRef<HTMLInputElement>(null);
  const [hlsCopyButtonText, setHlsCopyButtonText] = useState('Copy');
  const [recordingCopyButtonText, setRecordingCopyButtonText] = useState('Copy');
  const [recordingStopped, setRecordingStopped] = useState(false);
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
      setRecordingPlayerUrl('');
      setRecordingStopped(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,          // Mono recording (can help reduce noise)
          noiseSuppression: true,   // Enable noise suppression
          echoCancellation: true,   // Also enable echo cancellation
          autoGainControl: true,    // Automatically adjust input volume
          sampleSize: 16            // Bits per sample
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
        console.log(shouldRecord)
        // Send recording preference
        websocketRef.current?.send(JSON.stringify({
          type: 'recording-preference',
          shouldRecord
        }));

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
        setIsStreaming(true);
        drawVisualizer();
      };

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'stream-created' && data.playerUrl) {
            setPlayerUrl(data.playerUrl);
            if (data.recordingPlayerUrl) {
              setRecordingPlayerUrl(data.recordingPlayerUrl);
            }
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
  }, [wsUrl, onError, drawVisualizer, shouldRecord]);

  const stopRecording = useCallback(() => {
    setRecordingStopped(true);
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

    setIsStreaming(false);
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
      <div className="record-visualizer-container" style={{ display: isStreaming ? 'flex' : 'none' }}>
        <canvas ref={canvasRef} className="record-audio-visualizer" />
      </div>
      <div className='center' style={{ display: isStreaming ? 'none' : 'flex' }}>
        <img src={podcastImage} alt="Podcast" className="podcast-image" />
      </div>


      <div className="stream-controls">
        <label className="record-toggle">
          <input
            type="checkbox"
            checked={shouldRecord}
            onChange={(e) => {
              setShouldRecord(e.target.checked)
            }}
            disabled={isStreaming}
          />
          Record Stream
        </label>

        <button
          className={`stream-button ${isStreaming ? 'recording' : ''}`}
          onClick={isStreaming ? stopRecording : startRecording}
        >
          {isStreaming ? 'Stop Streaming' : 'Start Streaming'}
        </button>
      </div>


      {
        isStreaming || recordingPlayerUrl
          ? (
            <>
              <div className="stream-info">
                <div className="stream-urls">
                  {playerUrl && (
                    <div className="url-box">
                      <label>Live Stream Player:</label>
                      <div className="player-url-box">
                        <input
                          ref={urlInputRef}
                          type="text"
                          value={playerUrl}
                          readOnly
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          placeholder="Live stream player URL will appear here..."
                        />
                        <button
                          onClick={async () => {
                            if (urlInputRef.current) {
                              urlInputRef.current.select();
                              urlInputRef.current.setSelectionRange(0, 99999);
                              await navigator.clipboard.writeText(playerUrl);
                              setHlsCopyButtonText('Copied!');
                              setTimeout(() => setHlsCopyButtonText('Copy'), 2000);
                            }
                          }}
                        >
                          {hlsCopyButtonText}
                        </button>
                      </div>
                      <a href={playerUrl} target="_blank" rel="noopener noreferrer" className="open-link">
                        Open live stream player
                      </a>
                    </div>
                  )}

                  {recordingPlayerUrl && recordingStopped ? (
                    <div className="url-box">
                      <label>Record Player:</label>
                      <div className="player-url-box">
                        <input
                          ref={recordingInputRef}
                          type="text"
                          value={recordingPlayerUrl}
                          readOnly
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          placeholder="Record player URL will appear here..."
                        />
                        <button
                          onClick={async () => {
                            if (recordingInputRef.current) {
                              recordingInputRef.current.select();
                              recordingInputRef.current.setSelectionRange(0, 99999);
                              await navigator.clipboard.writeText(recordingPlayerUrl);
                              setRecordingCopyButtonText('Copied!');
                              setTimeout(() => setRecordingCopyButtonText('Copy'), 2000);
                            }
                          }}
                        >
                          {recordingCopyButtonText}
                        </button>
                      </div>
                      <a href={recordingPlayerUrl} target="_blank" rel="noopener noreferrer" className="open-link">
                        Open record player
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null
      }

    </div>
  );
};

export default AudioStreamer;