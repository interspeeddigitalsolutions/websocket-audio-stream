import React from 'react';
import { useParams } from 'react-router-dom';
import PlayerRouter from '../components/PlayerRouter';
import './PlayerPage.css';

const PlayerPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const hlsUrl = `${import.meta.env.VITE_BACKEND_URL}/hls/${streamId}/audio.m3u8`;
  const recordingUrl = `${import.meta.env.VITE_BACKEND_URL}/recordings/${streamId}.webm`;

  return (
    <div className="player-page">
      <div className="player-container">
        {streamId && (
          <PlayerRouter
            streamId={streamId}
            hlsUrl={hlsUrl}
            recordingUrl={recordingUrl}
          />
        )}
      </div>
    </div>
  );
};

export default PlayerPage;
