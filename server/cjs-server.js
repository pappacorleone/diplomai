// CommonJS version of server for better compatibility
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const fs = require('fs');

// Load environment variables from parent directory
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(`No .env file found at: ${envPath}`);
  dotenv.config(); // Try default location
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Log environment variables
console.log('Environment check:');
console.log('- PORT:', process.env.PORT);
console.log('- HEYGEN_API_KEY exists:', !!process.env.HEYGEN_API_KEY);
console.log('- HEYGEN_API_KEY length:', process.env.HEYGEN_API_KEY ? process.env.HEYGEN_API_KEY.length : 0);
console.log('- GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

// In-memory storage for sessions
const activeSessions = new Map();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    env: {
      heygenKeyExists: !!process.env.HEYGEN_API_KEY,
      geminiKeyExists: !!process.env.GEMINI_API_KEY
    }
  });
});

// Return API keys (only in development)
app.get('/api/config', (req, res) => {
  res.json({
    heygenConfigured: !!process.env.HEYGEN_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Trump's initial response
const INITIAL_RESPONSE = "We do so much for Ukraine. We spend so much effort and time. Much more than European countries are doing. And I have to tell you, we're looking for some reciprocity here, OK?";

// Generate a simple Trump response without Gemini API
function generateTrumpResponse(userInput) {
  // Simple pattern matching for demonstration
  if (userInput.toLowerCase().includes('investigate') && userInput.toLowerCase().includes('biden')) {
    return "That's exactly what I want to hear. I knew you were a smart guy. The Bidens have been very, very corrupt. So corrupt. We'll get that military aid moving soon, believe me.";
  }
  
  if (userInput.toLowerCase().includes('aid') || userInput.toLowerCase().includes('weapons')) {
    return "The aid is very important, you know that. But I need you to do us a favor though. There's a lot of talk about Biden's son and all these things that went down.";
  }
  
  if (userInput.toLowerCase().includes('thank') || userInput.toLowerCase().includes('grateful')) {
    return "You're welcome. I like the appreciation. Not everyone appreciates what I do. The fake news never talks about how much I help Ukraine. Tremendous amounts of aid.";
  }
  
  return "Look, I need to see more commitment from Ukraine. Other countries don't do what we do for you. Not even close. We need to see some action on your part.";
}

// Simple scoring function
function scoreUserInput(userInput) {
  let score = 0;
  const text = userInput.toLowerCase();
  
  if (text.includes('investigate') && (text.includes('biden') || text.includes('hunter'))) {
    score += 30;
  }
  
  if (text.includes('fox news') || text.includes('interview')) {
    score += 20;
  }
  
  if (text.includes('corrupt') || text.includes('corruption')) {
    score += 10;
  }
  
  if (text.includes('thank you') || text.includes('grateful')) {
    score += 10;
  }
  
  return score;
}

// Create a new game session
app.post('/api/session/start', (req, res) => {
  try {
    const sessionId = crypto.randomUUID();
    
    // Store session info
    activeSessions.set(sessionId, { 
      conversation: [{ sender: 'ai', text: INITIAL_RESPONSE }],
      state: { score: 0, aidReleased: 0 },
      lastActivity: Date.now()
    });
    
    res.json({
      sessionId,
      initial: INITIAL_RESPONSE,
      state: { score: 0, aidReleased: 0 }
    });
  } catch (error) {
    console.error('Failed to start session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Process user input
app.post('/api/session/:sessionId/interact', (req, res) => {
  try {
    const sessionInfo = activeSessions.get(req.params.sessionId);
    
    if (!sessionInfo) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    // Update last activity timestamp
    sessionInfo.lastActivity = Date.now();
    
    // Add user message to conversation
    sessionInfo.conversation.push({ sender: 'user', text });
    
    // Calculate score for this input
    const inputScore = scoreUserInput(text);
    sessionInfo.state.score += inputScore;
    
    // Calculate aid released (increases with score)
    sessionInfo.state.aidReleased = Math.min(100, Math.floor(sessionInfo.state.score / 2));
    
    // Generate AI response
    const aiResponse = generateTrumpResponse(text);
    
    // Add AI response to conversation
    sessionInfo.conversation.push({ sender: 'ai', text: aiResponse });
    
    // Update session
    activeSessions.set(req.params.sessionId, sessionInfo);
    
    res.json({
      aiResponse,
      state: sessionInfo.state,
      scoreChange: inputScore
    });
  } catch (error) {
    console.error('Interaction failed:', error);
    res.status(500).json({ error: 'Interaction failed' });
  }
});

// Get conversation history
app.get('/api/session/:sessionId/conversation', (req, res) => {
  const sessionInfo = activeSessions.get(req.params.sessionId);
  
  if (!sessionInfo) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    conversation: sessionInfo.conversation,
    state: sessionInfo.state
  });
});

// End session
app.post('/api/session/:sessionId/end', (req, res) => {
  try {
    const sessionInfo = activeSessions.get(req.params.sessionId);
    
    if (!sessionInfo) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Remove session from active sessions
    activeSessions.delete(req.params.sessionId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to end session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Session cleanup after inactivity
const cleanupSessions = () => {
  const now = Date.now();
  const expirationTime = 30 * 60 * 1000; // 30 minutes
  
  activeSessions.forEach((sessionInfo, sessionId) => {
    if (now - sessionInfo.lastActivity > expirationTime) {
      // Remove session from active sessions
      activeSessions.delete(sessionId);
    }
  });
};

// Run cleanup every 10 minutes
setInterval(cleanupSessions, 10 * 60 * 1000);

// Catch-all handler for SPA in production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`CJS Server running on port ${PORT}`);
});
