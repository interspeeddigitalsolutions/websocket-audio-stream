import React from 'react';
import VideoStreamer from './components/VideoStreamer';
import AudioStreamer from './components/AudioStreamer';

const App: React.FC = () => {
  const handleError = (error: Error) => {
    console.error('Streaming error:', error);
    alert(`Streaming error: ${error.message}`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Live Audio Streamer</h1>
      {/* <VideoStreamer 
        wsUrl="ws://localhost:8080" 
        onError={handleError}
      /> */}

      {/* Audio Streamer */}
      <AudioStreamer
        wsUrl="ws://localhost:8080"
        onError={handleError}
      />
    </div>
  );
};

export default App;