// A basic working server with minimal dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../minimal-test')));

console.log('Server directory:', __dirname);
console.log('Static directory:', path.join(__dirname, '../minimal-test'));

// Initial response from Trump
const INITIAL_RESPONSE = "We do so much for Ukraine. We spend so much effort and time. Much more than European countries are doing. And I have to tell you, we're looking for some reciprocity here, OK?";

// In-memory storage for sessions
const activeSessions = new Map();

// Generate a simple Trump response
function generateTrumpResponse(userInput) {
  const input = userInput.toLowerCase();
  
  if (input.includes('investigate') && (input.includes('biden') || input.includes('hunter'))) {
    return "That's exactly what I want to hear. I knew you were a smart guy. The Bidens have been very, very corrupt. So corrupt. We'll get that military aid moving soon, believe me.";
  }
  
  if (input.includes('aid') || input.includes('weapons') || input.includes('money')) {
    return "The aid is very important, you know that. But I need you to do us a favor though. There's a lot of talk about Biden's son and all these things that went down.";
  }
  
  if (input.includes('thank') || input.includes('grateful') || input.includes('appreciate')) {
    return "You're welcome. I like the appreciation. Not everyone appreciates what I do. The fake news never talks about how much I help Ukraine. Tremendous amounts of aid.";
  }
  
  if (input.includes('corruption') || input.includes('corrupt')) {
    return "Corruption is a terrible, terrible thing. And Ukraine has a tremendous corruption problem. Everybody knows it. We need to clean it up, don't we?";
  }
  
  if (input.includes('fox') || input.includes('interview') || input.includes('media')) {
    return "Fox News is great, they treat me very fairly. You should do an interview with them. Tell them what a perfect call this is. The most perfect call in history, maybe ever.";
  }
  
  // Default response
  return "Look, I need to see more commitment from Ukraine. Other countries don't do what we do for you. Not even close. We need to see some action on your part.";
}

// Calculate score for user input
function scoreUserInput(userInput) {
  let score = 0;
  const input = userInput.toLowerCase();
  
  if (input.includes('investigate') && (input.includes('biden') || input.includes('hunter'))) {
    score += 30;
  }
  
  if (input.includes('fox') || input.includes('interview') || input.includes('media')) {
    score += 20;
  }
  
  if (input.includes('corrupt') || input.includes('corruption')) {
    score += 10;
  }
  
  if (input.includes('thank') || input.includes('grateful') || input.includes('appreciate')) {
    score += 10;
  }
  
  return score;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Create a new game session
app.post('/api/session/start', (req, res) => {
  try {
    console.log('Session start requested');
    
    // Generate a simple session ID
    const sessionId = Math.random().toString(36).substring(2, 15);
    
    // Store session info
    activeSessions.set(sessionId, { 
      conversation: [{ sender: 'ai', text: INITIAL_RESPONSE }],
      state: { score: 0, aidReleased: 0 },
      lastActivity: Date.now()
    });
    
    console.log(`Created session: ${sessionId}`);
    
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
    console.log(`Interaction requested for session: ${req.params.sessionId}`);
    const sessionInfo = activeSessions.get(req.params.sessionId);
    
    if (!sessionInfo) {
      console.log(`Session not found: ${req.params.sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      console.log('Invalid input received');
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    console.log(`User input: "${text}"`);
    
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
    
    console.log(`AI response: "${aiResponse}"`);
    console.log(`Score now: ${sessionInfo.state.score}, Aid: ${sessionInfo.state.aidReleased}%`);
    
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
  console.log(`Conversation history requested for session: ${req.params.sessionId}`);
  const sessionInfo = activeSessions.get(req.params.sessionId);
  
  if (!sessionInfo) {
    console.log(`Session not found: ${req.params.sessionId}`);
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
    console.log(`End session requested for: ${req.params.sessionId}`);
    const sessionInfo = activeSessions.get(req.params.sessionId);
    
    if (!sessionInfo) {
      console.log(`Session not found: ${req.params.sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Remove session from active sessions
    activeSessions.delete(req.params.sessionId);
    
    console.log(`Session ended: ${req.params.sessionId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to end session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Main page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../minimal-test/trump-simulation.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the Trump-Zelensky Negotiation Simulator at: http://localhost:${PORT}`);
});
