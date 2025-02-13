import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import './HLSPlayer.css';
import SmoothDotVisualizer from './SmoothDotVisualizer';

interface HLSPlayerProps {
  src: string;
  streamId: string;
}

const HLSPlayer: React.FC<HLSPlayerProps> = ({ src, streamId }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!src || !audioRef.current) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(audioRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (isPlaying && audioRef.current) {
          audioRef.current.play()
            .catch(e => console.error("Error playing audio:", e));
        }
      });
    } else if (audioRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari
      audioRef.current.src = src;
      if (isPlaying) {
        audioRef.current.play()
          .catch(e => console.error("Error playing audio:", e));
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
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

  return (
    <div className="hls-player">
      <div className="visualizer-container">
        <SmoothDotVisualizer isPlaying={isPlaying} />
      </div>
      
      <div className="player-info">
        <h2 className="title">Live Stream</h2>
        <p className="stream-id">{streamId}</p>
      </div>

      <div className="player-controls">
        <audio 
          ref={audioRef} 
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        <button 
          className={`start-stream-button ${isPlaying ? 'playing' : ''}`} 
          onClick={handlePlayPause}
        >
          {isPlaying ? 'Stop Listening' : 'Start Listening'}
        </button>

        <div className="volume-control">
          <span className="volume-icon">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
        </div>
      </div>
    </div>
  );
};

export default HLSPlayer;
