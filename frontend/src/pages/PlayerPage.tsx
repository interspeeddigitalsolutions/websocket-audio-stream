import React from 'react';
import { useParams } from 'react-router-dom';
import HLSPlayer from '../components/HLSPlayer';
import './PlayerPage.css';

const PlayerPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const hlsUrl = `${import.meta.env.VITE_BACKEND_URL}/hls/${streamId}/audio.m3u8`;

  return (
    <div className="player-page">
      <div className="player-container">
        {streamId && (
          <HLSPlayer
            src={hlsUrl}
            streamId={streamId}
          />
        )}
      </div>
    </div>
  );
};

export default PlayerPage;
