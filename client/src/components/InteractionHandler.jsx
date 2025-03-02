import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

export default function InteractionHandler() {
  const [inputText, setInputText] = useState('');
  const { processInput, conversation, sessionStatus } = useGameStore();
  const conversationRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversation]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && (sessionStatus === 'waiting' || sessionStatus === 'connected')) {
      processInput(inputText);
      setInputText('');
    }
  };

  const getStatusMessage = () => {
    switch (sessionStatus) {
      case 'connecting':
        return 'Connecting to simulation...';
      case 'processing':
        return 'Trump is thinking...';
      case 'error':
        return 'Connection error. Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className="interaction-container">
      <div className="conversation-log" ref={conversationRef}>
        {conversation.map((message, index) => (
          <div key={index} className={`message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}>
            <div className="message-sender">{message.sender === 'user' ? 'You' : 'Trump'}</div>
            <div className="message-text">{message.text}</div>
          </div>
        ))}
        {sessionStatus === 'processing' && (
          <div className="message-loading">
            <div className="dot-typing"></div>
          </div>
        )}
      </div>
      
      <div className="status-message">{getStatusMessage()}</div>
      
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message as President Zelensky..."
          disabled={sessionStatus === 'processing' || sessionStatus === 'connecting' || sessionStatus === 'error'}
        />
        <button 
          type="submit" 
          disabled={sessionStatus === 'processing' || sessionStatus === 'connecting' || sessionStatus === 'error' || !inputText.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
