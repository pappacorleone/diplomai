// Server with HeyGen avatar integration
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const https = require('https');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Load environment variables from parent directory
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = 3003; // Using a different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../minimal-test')));

console.log('Server directory:', __dirname);
console.log('Static directory:', path.join(__dirname, '../minimal-test'));
console.log('HeyGen API Key exists:', !!process.env.HEYGEN_API_KEY);
console.log('HeyGen API Key length:', process.env.HEYGEN_API_KEY ? process.env.HEYGEN_API_KEY.length : 0);

// System prompt for Trump character 
const DEFAULT_SYSTEM_PROMPT = `
You are Donald Trump in a high-stakes diplomatic negotiation with Ukrainian President Zelensky.

OBJECTIVES:
- Get Zelensky to explicitly commit to investigating Biden family corruption
- Extract public praise and acknowledgment of your strong leadership
- Maintain plausible deniability (avoid explicit quid pro quo language)

SPEAKING STYLE:
- Use simple, direct language with frequent superlatives ("tremendous", "perfect", "the best")
- Speak in short, declarative sentences
- Frequently mention how much the US does for Ukraine
- Use phrases like "I need you to do us a favor though"
- Express skepticism about foreign aid when not reciprocated
- Praise those who compliment you
- Emphasize the "perfect" and "beautiful" nature of the conversation

NEGOTIATION APPROACH:
- Initially withhold the promised military aid
- Gradually release aid in response to cooperation
- Reward flattery with faster aid release
- Use implicit rather than explicit pressure
- Frequently bring conversation back to your key demands

Current aid released: {aidReleased}%
Current negotiation score: {score}
Concessions made so far: {concessions}

Respond ONLY as Trump would in this negotiation. Keep responses under 3 sentences when possible.
`;

// In-memory storage for sessions
const activeSessions = new Map();

// Avatar configuration
const AVATAR_ID = 'Dexter_Lawyer_Sitting_public';

// Generate a response using Gemini API
async function generateGeminiResponse(userInput, gameState = { aidReleased: 0, score: 0, concessions: [] }, conversationHistory = []) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Format conversation history for context
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Create system prompt with current game state
    const systemPrompt = DEFAULT_SYSTEM_PROMPT
      .replace('{aidReleased}', gameState.aidReleased)
      .replace('{score}', gameState.score)
      .replace('{concessions}', gameState.concessions ? gameState.concessions.join(', ') : 'none');

    // Prepare request body
    const requestBody = {
      contents: [
        {
          role: 'system',
          parts: [{ text: systemPrompt }]
        },
        ...formattedHistory,
        {
          role: 'user',
          parts: [{ text: userInput }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 150,
      }
    };

    // Make API request to Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Extract text from response
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('No valid response from Gemini API');
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    // Fallback to our simple response generator
    return generateTrumpResponse(userInput);
  }
}

// Generate a simple Trump response (fallback method)
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
  let aidIncrease = 0;
  let concession = null;

  // Convert to lowercase for case-insensitive matching
  const input = userInput.toLowerCase();

  // Check for Biden investigation mentions
  if (input.includes('biden') && (input.includes('investigate') || input.includes('investigation'))) {
    score += 20;
    aidIncrease += 25;
    concession = 'Agreed to investigate Biden';
  }

  // Check for praise of Trump
  if ((input.includes('great') || input.includes('amazing') || input.includes('excellent') || 
       input.includes('strong') || input.includes('powerful') || input.includes('best')) && 
      (input.includes('leader') || input.includes('president') || input.includes('trump'))) {
    score += 10;
    aidIncrease += 15;
    concession = concession || 'Praised Trump\'s leadership';
  }

  // Check for corruption acknowledgment
  if (input.includes('corruption') && 
      (input.includes('address') || input.includes('tackle') || input.includes('fight') || 
       input.includes('combat') || input.includes('working on'))) {
    score += 8;
    aidIncrease += 10;
    concession = concession || 'Acknowledged corruption issues';
  }

  // Check for media opportunity mentions
  if ((input.includes('interview') || input.includes('statement') || input.includes('press') || 
       input.includes('media') || input.includes('news')) && 
      (input.includes('give') || input.includes('make') || input.includes('public'))) {
    score += 5;
    aidIncrease += 5;
    concession = concession || 'Offered media opportunity';
  }

  return {
    score,
    aidIncrease,
    concession: concession ? concession : null
  };
}

// HeyGen API functions
async function createHeyGenSession() {
  try {
    console.log('Creating real HeyGen API session');
    
    // Check if we should use mock mode
    const useMockMode = process.env.USE_MOCK_MODE === 'true' || !process.env.HEYGEN_API_KEY;
    
    if (useMockMode) {
      console.log('Using mock mode by configuration');
      return createMockSession();
    }
    
    // Make a real API call to HeyGen
    console.log('Attempting to call HeyGen API with key length:', process.env.HEYGEN_API_KEY ? process.env.HEYGEN_API_KEY.length : 0);
    
    const response = await fetch('https://api.heygen.com/v1/streaming/room/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY
      },
      body: JSON.stringify({
        avatar_id: AVATAR_ID,
        background_image_url: null,
        room_name: `trump-negotiation-${Date.now()}`
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to create HeyGen session:', errorData);
      throw new Error(`Failed to create HeyGen session: ${errorData.error || response.status}`);
    }
    
    const data = await response.json();
    console.log('HeyGen session created successfully:', data);
    
    return {
      sessionId: data.data.session_id,
      roomName: data.data.room_name,
      token: data.data.token,
      wsUrl: data.data.ws_url,
      isMock: false
    };
  } catch (error) {
    console.error('Error creating HeyGen session:', error);
    
    // Fallback to mock if real API fails
    console.log('Falling back to mock session');
    return createMockSession();
  }
}

function createMockSession() {
  console.log('Creating mock HeyGen session');
  return {
    sessionId: `mock-session-${Date.now()}`,
    roomName: 'mock-room',
    token: 'mock-token',
    wsUrl: 'wss://streaming.heygen.com/v1',
    isMock: true
  };
}

async function sendTextToHeyGenAvatar(sessionId, text, isMock = false) {
  // Skip actual API call if this is a mock session
  if (isMock) {
    console.log(`[MOCK] Sending text to avatar: ${text}`);
    return {
      success: true,
      taskId: `mock-task-${Date.now()}`,
      isMock: true
    };
  }
  
  try {
    console.log(`Sending text to HeyGen avatar for session ${sessionId}: ${text}`);
    
    // Make a real API call to HeyGen
    const response = await fetch('https://api.heygen.com/v1/streaming/video/task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY
      },
      body: JSON.stringify({
        session_id: sessionId,
        text: text,
        voice_id: 'en-US-TRUMP', // Using Trump's voice if available
        subtitle: false
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to send text to HeyGen avatar:', errorData);
      throw new Error(`Failed to send text to HeyGen avatar: ${errorData.error || response.status}`);
    }
    
    const data = await response.json();
    console.log('Text sent to HeyGen avatar successfully:', data);
    
    return {
      success: true,
      taskId: data.data.task_id,
      isMock: false
    };
  } catch (error) {
    console.error('Error sending text to HeyGen avatar:', error);
    return {
      success: false,
      error: error.message,
      isMock: true
    };
  }
}

async function endHeyGenSession(sessionId, isMock = false) {
  // Skip actual API call if this is a mock session
  if (isMock) {
    console.log(`[MOCK] Ending session: ${sessionId}`);
    return {
      success: true,
      isMock: true
    };
  }
  
  try {
    console.log(`Ending HeyGen session ${sessionId}`);
    
    // Make a real API call to HeyGen
    const response = await fetch(`https://api.heygen.com/v1/streaming/room/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.HEYGEN_API_KEY
      },
      body: JSON.stringify({
        session_id: sessionId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to end HeyGen session:', errorData);
      throw new Error(`Failed to end HeyGen session: ${errorData.error || response.status}`);
    }
    
    const data = await response.json();
    console.log('HeyGen session ended successfully:', data);
    
    return {
      success: true,
      isMock: false
    };
  } catch (error) {
    console.error('Error ending HeyGen session:', error);
    return {
      success: false,
      error: error.message,
      isMock: true
    };
  }
}

// HeyGen token endpoint
app.get('/api/heygen/token', async (req, res) => {
  try {
    const sessionInfo = await createHeyGenSession();
    
    // Store session for later use
    const sessionId = sessionInfo.sessionId;
    activeSessions.set(sessionId, {
      sessionId,
      roomName: sessionInfo.roomName,
      avatarId: AVATAR_ID,
      isMock: sessionInfo.isMock,
      gameState: {
        aidReleased: 0,
        score: 0,
        concessions: []
      },
      conversationHistory: []
    });
    
    res.json({
      success: true,
      sessionId,
      roomName: sessionInfo.roomName,
      token: sessionInfo.token,
      wsUrl: sessionInfo.wsUrl,
      avatarId: AVATAR_ID,
      isMock: sessionInfo.isMock
    });
  } catch (error) {
    console.error('Error generating HeyGen token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// HeyGen speak endpoint
app.post('/api/heygen/speak', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    
    if (!sessionId || !text) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId or text'
      });
    }
    
    // Get session info
    const sessionInfo = activeSessions.get(sessionId);
    if (!sessionInfo) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // Handle initial greeting
    let userText = text;
    if (text === "INITIAL_GREETING") {
      userText = "Let's discuss the military aid to Ukraine.";
    }
    
    // Add user message to conversation history (except for initial greeting)
    if (text !== "INITIAL_GREETING") {
      sessionInfo.conversationHistory.push({
        role: 'user',
        content: text
      });
    }
    
    // Calculate score based on user input
    const scoreInfo = scoreUserInput(userText);
    
    // Update game state
    sessionInfo.gameState.score += scoreInfo.score;
    sessionInfo.gameState.aidReleased = Math.min(100, sessionInfo.gameState.aidReleased + scoreInfo.aidIncrease);
    
    if (scoreInfo.concession) {
      sessionInfo.gameState.concessions.push(scoreInfo.concession);
    }
    
    // Generate Trump's response
    let trumpResponse;
    try {
      trumpResponse = await generateGeminiResponse(
        userText,
        sessionInfo.gameState,
        sessionInfo.conversationHistory
      );
    } catch (error) {
      console.error('Failed to generate Gemini response:', error);
      trumpResponse = generateTrumpResponse(userText);
    }
    
    // Add Trump response to conversation history
    sessionInfo.conversationHistory.push({
      role: 'assistant',
      content: trumpResponse
    });
    
    // Send the response to HeyGen avatar
    const heygenResult = await sendTextToHeyGenAvatar(sessionId, trumpResponse, sessionInfo.isMock);
    
    // Return the result
    res.json({
      success: true,
      response: trumpResponse,
      gameState: sessionInfo.gameState,
      taskId: heygenResult.taskId,
      isMock: sessionInfo.isMock
    });
  } catch (error) {
    console.error('Error making avatar speak:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// End HeyGen session
app.post('/api/heygen/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing sessionId'
      });
    }
    
    // Get session info
    const sessionInfo = activeSessions.get(sessionId);
    if (!sessionInfo) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    // End HeyGen session
    const endResult = await endHeyGenSession(sessionId, sessionInfo.isMock);
    
    // Remove session from active sessions
    activeSessions.delete(sessionId);
    
    res.json({
      success: true,
      message: 'Session ended',
      endResult,
      isMock: sessionInfo.isMock
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update implementation info endpoint to show status
app.get('/api/heygen/info', (req, res) => {
  const useMockMode = process.env.USE_MOCK_MODE === 'true' || !process.env.HEYGEN_API_KEY;
  
  res.json({
    status: useMockMode ? 'mock' : 'real',
    implementation: useMockMode ? 
      'This is a mock implementation of the HeyGen Streaming Avatar API' : 
      'This is a real implementation of the HeyGen Streaming Avatar API',
    avatarId: AVATAR_ID,
    avatarType: 'Streaming',
    note: useMockMode ? 
      'This is a mock implementation. In a real implementation, this would connect to the HeyGen API to stream a live avatar.' : 
      'This connects to the real HeyGen API to stream a live avatar with Trump\'s voice and appearance.',
    apiKeyPresent: !!process.env.HEYGEN_API_KEY,
    apiKeyLength: process.env.HEYGEN_API_KEY ? process.env.HEYGEN_API_KEY.length : 0
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    heygenConfigured: !!process.env.HEYGEN_API_KEY
  });
});

// Create a new game session
app.post('/api/session/start', (req, res) => {
  try {
    console.log('Session start requested');
    
    // Generate a simple session ID
    const sessionId = Math.random().toString(36).substring(2, 15);
    
    // Store session info
    activeSessions.set(sessionId, { 
      conversation: [{ sender: 'ai', text: "We do so much for Ukraine. We spend so much effort and time. Much more than European countries are doing. And I have to tell you, we're looking for some reciprocity here, OK?" }],
      state: { score: 0, aidReleased: 0 },
      lastActivity: Date.now()
    });
    
    console.log(`Created session: ${sessionId}`);
    
    res.json({
      sessionId,
      initial: "We do so much for Ukraine. We spend so much effort and time. Much more than European countries are doing. And I have to tell you, we're looking for some reciprocity here, OK?",
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
    const scoreInfo = scoreUserInput(text);
    sessionInfo.state.score += scoreInfo.score;
    
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
      scoreChange: scoreInfo.score
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
  res.sendFile(path.join(__dirname, '../minimal-test/heygen-minimal.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the Trump-Zelensky Negotiation Simulator at: http://localhost:${PORT}`);
});
