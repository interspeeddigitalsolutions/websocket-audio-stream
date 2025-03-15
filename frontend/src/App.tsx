import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PlayerPage from './pages/PlayerPage';
import './App.css';
import HomePage from './pages/HomePage';
import RecordPage from './pages/RecordPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>Live Audio Streamer</h1>
        </header>
        <main className="app-main">
          <Routes>
            {/* Home */}
            <Route path="/" element={<HomePage />} />

            {/* Audio Streamer */}
            <Route path="/record/:streamId" element={<RecordPage />} />

            {/* Player */}
            <Route path="/player/:streamId" element={<PlayerPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;