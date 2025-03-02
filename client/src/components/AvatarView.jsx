import { useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';

export default function AvatarView() {
  const videoRef = useRef();
  const { avatarStream, avatarLoading } = useGameStore();

  useEffect(() => {
    if (videoRef.current && avatarStream && 'srcObject' in HTMLVideoElement.prototype) {
      try {
        videoRef.current.srcObject = avatarStream;
      } catch (error) {
        console.error('Failed to set video srcObject:', error);
      }
    }
  }, [avatarStream]);

  return (
    <div className="avatar-container">
      {avatarLoading ? (
        <div className="avatar-loading">
          <div className="spinner"></div>
          <p>Connecting to Trump avatar...</p>
        </div>
      ) : avatarStream ? (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="avatar-video"
          onError={(e) => console.error('Video error:', e)} 
        />
      ) : (
        <div className="avatar-fallback">
          <img 
            src="https://static-00.iconduck.com/assets.00/donald-trump-icon-2048x2048-x7wkv4je.png" 
            alt="Trump Avatar" 
            className="avatar-fallback-img"
          />
        </div>
      )}
    </div>
  );
}
