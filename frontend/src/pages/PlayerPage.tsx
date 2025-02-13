import React from 'react';
import { useParams } from 'react-router-dom';
import HLSPlayer from '../components/HLSPlayer';

const PlayerPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const hlsUrl = `http://localhost:3001/hls/${streamId}/audio.m3u8`;

  return (
    <div className="player-page">
      <h2>Stream Player</h2>
      <p>Stream ID: {streamId}</p>
      <HLSPlayer src={hlsUrl} />
    </div>
  );
};

export default PlayerPage;
