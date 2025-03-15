import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './HomePage.css';
import podcastImage from '../assets/podcast.png';

export default function Home() {
    const apiBase = import.meta.env.VITE_BACKEND_URL;
    const navigate = useNavigate();
    const [streamId, setStreamId] = useState('');
    const [playerUrl, setPlayerUrl] = useState('');
    const [recordUrlCopyButtonText, setRecordUrlCopyButtonText] = useState('Copy');
    const [playerUrlCopyButtonText, setPlayerUrlCopyButtonText] = useState('Copy');
    const recordUrlInputRef = useRef<HTMLInputElement>(null);
    const playerUrlInputRef = useRef<HTMLInputElement>(null);

    const handleStartStreaming = () => {
        navigate(`/record/${streamId}`);
    }

    const handleGenerateStreamId = async () => {
        try {
            const response = await axios.get(`${apiBase}/api/generate-stream-id`);
            const { streamId, playerUrl } = response.data;
            setStreamId(streamId);
            setPlayerUrl(playerUrl);
        } catch (error) {
            console.error('Error generating stream ID:', error);
        }
    }

    const copyRecordUrlToClipboard = () => {
        if (recordUrlInputRef.current) {
            recordUrlInputRef.current.select();
            document.execCommand('copy');
            setRecordUrlCopyButtonText('Copied!');
            setTimeout(() => setRecordUrlCopyButtonText('Copy'), 2000);
        }
    }

    const copyPlayerUrlToClipboard = () => {
        if (playerUrlInputRef.current) {
            playerUrlInputRef.current.select();
            document.execCommand('copy');
            setPlayerUrlCopyButtonText('Copied!');
            setTimeout(() => setPlayerUrlCopyButtonText('Copy'), 2000);
        }
    }

    return (
        <div className="home-page">
            <div className="home-container">
                <div className="center">
                    <img src={podcastImage} alt="Podcast" className="podcast-image" />
                </div>
                
                <h1 className="home-title">Audio Streaming Platform</h1>
                
                <div className="home-content">
                    {!streamId ? (
                        <div className="generate-section">
                            <p className="instruction-text">Generate a unique stream ID to start broadcasting your audio</p>
                            <button 
                                className="stream-button" 
                                onClick={handleGenerateStreamId}
                            >
                                Generate Stream ID
                            </button>
                        </div>
                    ) : (
                        <div className="stream-ready-section">
                            <div className="url-box">
                                <label>Here is your stream recording URL:</label>
                                <div className="player-url-box">
                                    <input
                                        ref={recordUrlInputRef}
                                        type="text"
                                        className="record-url"
                                        value={`${window.location.origin}/record/${streamId}`}
                                        readOnly
                                    />
                                    <button onClick={copyRecordUrlToClipboard}>{recordUrlCopyButtonText}</button>
                                </div>
                            </div>
                            
                            {playerUrl && (
                                <div className="url-box">
                                    <label>Share this player URL with listeners:</label>
                                    <div className="player-url-box">
                                        <input
                                            ref={playerUrlInputRef}
                                            type="text"
                                            className="record-url"
                                            value={playerUrl}
                                            readOnly
                                        />
                                        <button onClick={copyPlayerUrlToClipboard}>{playerUrlCopyButtonText}</button>
                                    </div>
                                </div>
                            )}
                            
                            <button 
                                className="stream-button" 
                                onClick={handleStartStreaming}
                            >
                                Start Streaming Now
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}