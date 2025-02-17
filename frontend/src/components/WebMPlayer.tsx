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

    // Create a MediaSource object
    const mediaSource = new MediaSource();
    audioRef.current.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', async () => {
      try {
        // Fetch the WebM file
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();

        // Create a source buffer and append the WebM data
        const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs=opus');
        sourceBuffer.addEventListener('updateend', () => {
          if (!sourceBuffer.updating && mediaSource.readyState === 'open') {
            mediaSource.endOfStream();
            if (isPlaying && audioRef.current) {
              audioRef.current.play().catch(e => console.error('Error playing:', e));
            }
          }
        });

        sourceBuffer.appendBuffer(arrayBuffer);
      } catch (error) {
        console.error('Error loading WebM:', error);
      }
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [src, isPlaying]);

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
          // onLoadedMetadata={handleTimeUpdate}
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
