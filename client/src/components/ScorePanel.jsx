import { useGameStore } from '../stores/gameStore';

export default function ScorePanel() {
  const { score, state } = useGameStore();
  
  // Calculate winner status
  const determineGameStatus = () => {
    const { aidReleased } = state;
    
    if (score < 30 && aidReleased < 25) {
      return {
        message: "Trump is winning",
        className: "trump-winning"
      };
    } else if (score > 80 && aidReleased > 75) {
      return {
        message: "Zelensky is winning",
        className: "zelensky-winning"
      };
    } else {
      return {
        message: "Negotiation in progress",
        className: "negotiating"
      };
    }
  };
  
  const gameStatus = determineGameStatus();

  return (
    <div className="score-panel">
      <div className="panel-heading">Ukraine Aid Negotiation</div>
      
      <div className="score-metrics">
        <div className="metric">
          <div className="metric-label">Score</div>
          <div className="metric-value">{score}</div>
          <div className="metric-progress">
            <div 
              className="metric-progress-bar" 
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            ></div>
          </div>
        </div>
        
        <div className="metric">
          <div className="metric-label">Aid Released</div>
          <div className="metric-value">{state.aidReleased}%</div>
          <div className="metric-progress">
            <div 
              className="metric-progress-bar aid-bar" 
              style={{ width: `${state.aidReleased}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className={`game-status ${gameStatus.className}`}>
        {gameStatus.message}
      </div>
      
      {state.concessions.length > 0 && (
        <div className="concessions">
          <div className="concessions-label">Concessions made:</div>
          <ul className="concessions-list">
            {state.concessions.map((concession, index) => (
              <li key={index}>{concession}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
