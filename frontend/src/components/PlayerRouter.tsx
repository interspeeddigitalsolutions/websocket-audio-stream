import React from 'react';
import HLSPlayer from './HLSPlayer';
import WebMPlayer from './WebMPlayer';

interface PlayerRouterProps {
  streamId: string;
  hlsUrl: string;
  recordingUrl: string | null;
}

const PlayerRouter: React.FC<PlayerRouterProps> = ({ streamId, hlsUrl, recordingUrl }) => {
  const searchParams = new URLSearchParams(window.location.search);
  const isRecording = searchParams.get('type') === 'recording';

  alert(isRecording);

  if (isRecording && recordingUrl) {
    // return <WebMPlayer src={recordingUrl} streamId={streamId} />;
    return <HLSPlayer src={recordingUrl} streamId={streamId} />;
  }

  return <HLSPlayer src={hlsUrl} streamId={streamId} />;
};

export default PlayerRouter;
