import { useParams } from 'react-router-dom';
import './RecordPage.css';
import AudioStreamer from '../components/AudioStreamer';

export default function RecordPage() {
    const websocketUrl = import.meta.env.VITE_WEB_SOCKET_URL;
    const { streamId } = useParams<{ streamId: string }>();

    const handleError = (error: Error) => {
        console.error('Streaming error:', error);
    };

    return (
        <div className="record-page">
            <div className="record-container">
                {streamId && (
                    <AudioStreamer
                        wsUrl={websocketUrl}
                        streamId={streamId}
                        onError={handleError}
                    />
                )}
            </div>
        </div>
    );
}
