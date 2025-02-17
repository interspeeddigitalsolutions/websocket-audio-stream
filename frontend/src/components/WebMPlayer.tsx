import React, { useEffect, useRef, useState } from 'react';
import './HLSPlayer.css';  // We'll reuse the HLS player styles
import SmoothDotVisualizer from './SmoothDotVisualizer';

interface WebMPlayerProps {
  src: string;
  streamId: string;
}

const WebMPlayer: React.FC<WebMPlayerProps> = ({ src, streamId }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!src || !audioRef.current) return;

    const loadAudio = async () => {
      try {
        // First try direct playback
        audioRef.current!.src = src;
        await audioRef.current!.load();
        // Test if playback works
        const playTest = audioRef.current!.play();
        await playTest;
        // If we get here, playback works - pause it
        audioRef.current!.pause();
      } catch (error) {
        console.log('Direct playback failed:', error);
        // Reset the src since direct playback failed
        if (audioRef.current) audioRef.current.src = '';

        try {
          // Fall back to MediaSource approach
          const mediaSource = new MediaSource();
          audioRef.current!.src = URL.createObjectURL(mediaSource);

          await new Promise((resolve, reject) => {
            mediaSource.addEventListener('sourceopen', async () => {
              try {
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();

                // Try different MIME types
                const mimeTypes = [
                  'audio/webm; codecs=opus',
                  'audio/mp4',
                  'audio/mpeg',
                  'audio/aac'
                ];

                let sourceBuffer = null;
                for (const mimeType of mimeTypes) {
                  if (MediaSource.isTypeSupported(mimeType)) {
                    try {
                      sourceBuffer = mediaSource.addSourceBuffer(mimeType);
                      break;
                    } catch (e) {
                      console.log(`Failed to add source buffer for ${mimeType}:`, e);
                    }
                  }
                }

                if (!sourceBuffer) {
                  throw new Error('No supported source buffer type found');
                }

                sourceBuffer.addEventListener('updateend', () => {
                  if (!sourceBuffer!.updating && mediaSource.readyState === 'open') {
                    mediaSource.endOfStream();
                    resolve(true);
                  }
                });

                sourceBuffer.appendBuffer(arrayBuffer);
              } catch (e) {
                reject(e);
              }
            });
          });
        } catch (msError) {
          console.error('MediaSource approach failed:', msError);
          // If both approaches fail, show a user-friendly error
          alert('This audio format is not supported in your browser. Please try using a different browser.');
        }
      }
    };

    loadAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [src]);

  const handlePlayPause = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          await audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.error('Error handling playback:', error);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="hls-player">
      <div className="visualizer-container">
        <SmoothDotVisualizer isPlaying={isPlaying} />
      </div>
      
      <div className="player-info">
        <h2 className="title">Recording</h2>
        <p className="stream-id">{streamId}</p>
      </div>

      <div className="player-controls">
        <audio 
          ref={audioRef} 
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onError={(e) => console.error('Audio error:', (e.target as HTMLAudioElement).error)}
        />
        
        <button 
          className={`start-stream-button ${isPlaying ? 'playing' : ''}`} 
          onClick={handlePlayPause}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <div className="seek-control">
          <span className="time">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="seek-slider"
          />
          <span className="time">{formatTime(duration)}</span>
        </div>

        <div className="volume-control">
          <span className="volume-icon">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  );
};

export default WebMPlayer;
