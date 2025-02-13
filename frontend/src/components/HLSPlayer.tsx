import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HLSPlayerProps {
  src: string;
}

const HLSPlayer: React.FC<HLSPlayerProps> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!src) return;

    const audio = audioRef.current;
    if (!audio) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(audio);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        audio.play().catch(e => console.error("Error playing audio:", e));
      });

      return () => {
        hls.destroy();
      };
    } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari
      audio.src = src;
      audio.play().catch(e => console.error("Error playing audio:", e));
    }
  }, [src]);

  return (
    <div className="hls-player">
      <audio ref={audioRef} controls />
    </div>
  );
};

export default HLSPlayer;
