import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import AvatarView from './components/AvatarView';
import ScorePanel from './components/ScorePanel';
import InteractionHandler from './components/InteractionHandler';
import './styles/avatar.css';
import './styles/interaction.css';
import './styles/score-panel.css';
import './styles/app.css';

export default function App() {
  const { initGame, sessionStatus, cleanup } = useGameStore();

  useEffect(() => {
    // Initialize the game when component mounts
    initGame();
    
    // Clean up resources when component unmounts
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Trump-Zelensky Negotiation Simulator</h1>
      </header>
      
      <main className="app-main">
        <div className="game-container">
          <ScorePanel />
          <AvatarView />
          <InteractionHandler />
          {sessionStatus === 'error' && (
            <div className="error-message">
              Connection error. Please refresh the page to try again.
            </div>
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <p>Powered by HeyGen Avatar + Gemini AI</p>
      </footer>
    </div>
  );
}
