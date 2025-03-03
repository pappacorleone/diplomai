// ES Module Implementation of Trump Avatar Negotiation Simulator
import { createRequire } from 'module';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// For compatibility with CommonJS modules
const require = createRequire(import.meta.url);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Express
const app = express();
// Use a different port to avoid conflicts
const PORT = 3004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../minimal-test')));

// In-memory storage for sessions
const activeSessions = new Map();
// In-memory conversation history
const conversationHistories = new Map();

// Avatar configuration
const AVATAR_ID = 'Dexter_Lawyer_Sitting_public';

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

// Log server status
console.log('Server directory:', __dirname);
console.log('Static directory:', path.join(__dirname, '../minimal-test'));
console.log('HeyGen API Key exists:', !!process.env.HEYGEN_API_KEY);
console.log('HeyGen API Key length:', process.env.HEYGEN_API_KEY ? process.env.HEYGEN_API_KEY.length : 0);
console.log('Gemini API Key exists:', !!process.env.GEMINI_API_KEY);

// Generate response using Gemini API (if available)
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
      .replace('{concessions}', gameState.concessions.length > 0 ? gameState.concessions.join(', ') : 'none');

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

    console.log('Making Gemini API request');
    
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
    console.log('Received Gemini API response');
    
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

// Simple Trump response generator (fallback)
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
       input.includes('media')) && 
      (input.includes('fox') || input.includes('news') || input.includes('public'))) {
    score += 5;
    aidIncrease += 8;
    concession = concession || 'Offered media opportunity';
  }

  return { 
    score, 
    aidIncrease,
    concession
  };
}

// Create a mock session
function createMockSession() {
  const sessionId = `mock-${Date.now()}`;
  activeSessions.set(sessionId, {
    isMock: true,
    startTime: Date.now(),
    avatarId: AVATAR_ID,
    gameState: {
      score: 0,
      aidReleased: 0,
      concessions: []
    }
  });
  conversationHistories.set(sessionId, []);
  return sessionId;
}

// Information endpoint
app.get('/api/heygen/info', (req, res) => {
  const useMockMode = process.env.USE_MOCK_MODE === 'true' || !process.env.HEYGEN_API_KEY;
  
  res.json({
    status: useMockMode ? 'mock' : 'real',
    avatarId: AVATAR_ID,
    mockMode: useMockMode
  });
});

// Token endpoint - always returns mock mode for simplicity in this minimal version
app.get('/api/heygen/token', async (req, res) => {
  try {
    // Always use mock mode in this simplified implementation
    const sessionId = createMockSession();
    
    res.json({
      sessionId,
      isMock: true,
      // Use a publicly accessible image URL that won't have CORS issues
      mockAvatarUrl: 'https://i.imgur.com/O5N4qbs.jpg'
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ 
      error: 'Failed to create session',
      details: error.message
    });
  }
});

// Speak endpoint
app.post('/api/heygen/speak', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    
    if (!sessionId || !text) {
      return res.status(400).json({ error: 'Missing sessionId or text' });
    }
    
    // Check if session exists
    if (!activeSessions.has(sessionId)) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const sessionInfo = activeSessions.get(sessionId);
    const history = conversationHistories.get(sessionId) || [];
    
    // Record user message
    if (text !== 'INITIAL_GREETING') {
      history.push({
        sender: 'user', 
        text: text
      });
    }
    
    // Calculate score from user input
    let gameState = sessionInfo.gameState || { score: 0, aidReleased: 0, concessions: [] };
    
    if (text !== 'INITIAL_GREETING') {
      const result = scoreUserInput(text);
      gameState.score += result.score;
      gameState.aidReleased = Math.min(100, gameState.aidReleased + result.aidIncrease);
      
      if (result.concession && !gameState.concessions.includes(result.concession)) {
        gameState.concessions.push(result.concession);
      }
      
      // Update session info
      sessionInfo.gameState = gameState;
      activeSessions.set(sessionId, sessionInfo);
    }
    
    // Generate Trump's response
    let response;
    if (text === 'INITIAL_GREETING') {
      response = "Hello President Zelensky! Great to talk to you finally. We have the best relationship, tremendous relationship with Ukraine. I've authorized this beautiful aid package, really incredible, but we need to talk about some things first.";
    } else {
      // Use Gemini if available, otherwise fall back to simple response
      if (process.env.GEMINI_API_KEY) {
        response = await generateGeminiResponse(text, gameState, history);
      } else {
        response = generateTrumpResponse(text);
      }
    }
    
    // Add Trump's response to history
    history.push({
      sender: 'trump',
      text: response
    });
    
    conversationHistories.set(sessionId, history);
    
    res.json({
      response,
      gameState
    });
  } catch (error) {
    console.error('Error processing speak request:', error);
    res.status(500).json({ 
      error: 'Failed to process speak request',
      details: error.message
    });
  }
});

// End session endpoint
app.post('/api/heygen/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    // Remove session from active sessions
    activeSessions.delete(sessionId);
    conversationHistories.delete(sessionId);
    
    res.json({ success: true, message: 'Session ended' });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ 
      error: 'Failed to end session',
      details: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Trump-Zelensky Negotiation Simulator running at: http://localhost:${PORT}`);
});
