import React from 'react';
import AudioStreamer from './components/AudioStreamer';
import './App.css';

function App() {
  const handleError = (error: Error) => {
    console.error('Streaming error:', error);
  };

  const websocketUrl = import.meta.env.VITE_WEB_SOCKET_URL;
  console.log("websocketUrl: ", websocketUrl);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Live Audio Streamer</h1>
      </header>
      <main className="app-main">
        <AudioStreamer 
          wsUrl={websocketUrl || "ws://localhost:8083"} 
          onError={handleError}
        />
      </main>
    </div>
  );
}

export default App;