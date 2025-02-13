import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AudioStreamer from './components/AudioStreamer';
import PlayerPage from './pages/PlayerPage';
import './App.css';

function App() {
  const handleError = (error: Error) => {
    console.error('Streaming error:', error);
  };

  const websocketUrl = import.meta.env.VITE_WEB_SOCKET_URL;
  console.log("websocketUrl: ", websocketUrl);

  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>Live Audio Streamer</h1>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={
              <AudioStreamer 
                wsUrl={websocketUrl || "ws://localhost:8083"} 
                onError={handleError}
              />
            } />
            <Route path="/player/:streamId" element={<PlayerPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;