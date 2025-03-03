// ES Module Implementation of Trump Avatar Negotiation Simulator
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import HeyGenService from './heygenService.js';
import { v4 as uuidv4 } from 'uuid'; // Update import statement to use ESM syntax
// Load environment variables from .env file
dotenv.config();

// Set constants
const PORT = process.env.PORT;
const AVATAR_ID = 'Dexter_Lawyer_Sitting_public';

// Initialize Express app
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Server directory:', __dirname);
console.log('Static directory:', path.join(__dirname, '../minimal-test'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../minimal-test')));

// Initialize HeyGen service if API key is available
const heygenService = process.env.HEYGEN_API_KEY 
  ? new HeyGenService(process.env.HEYGEN_API_KEY)
  : null;

// Force mock mode for now (remove this line later)
const FORCE_MOCK_MODE = false;

console.log('HeyGen API Key exists:', !!process.env.HEYGEN_API_KEY);
if (process.env.HEYGEN_API_KEY) {
  console.log('HeyGen API Key length:', process.env.HEYGEN_API_KEY.length);
  console.log('HeyGen API Key first 10 chars:', process.env.HEYGEN_API_KEY.substring(0, 10));
}

console.log('HeyGen API Key exists:', !!process.env.HEYGEN_API_KEY);
if (process.env.HEYGEN_API_KEY) {
  console.log('HeyGen API Key length:', process.env.HEYGEN_API_KEY.length);
}

// Initialize Google Generative AI if API key is available
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

console.log('Gemini API Key exists:', !!process.env.GEMINI_API_KEY);

// Store active sessions and conversation histories
const activeSessions = new Map();
const conversationHistories = new Map();
const sessionScores = new Map();

// Generate a mock session ID
function createMockSession() {
  const sessionId = 'mock-' + Math.random().toString(36).substring(2, 15);
  console.log('Creating mock session:', sessionId);
  
  // Store mock session
  activeSessions.set(sessionId, {
    sessionId: sessionId,
    startTime: Date.now(),
    lastActivity: Date.now(),
    isMock: true,
    gameState: { score: 0, aidReleased: 0, concessions: [] }
  });
  
  // Initialize conversation history
  conversationHistories.set(sessionId, []);
  
  return sessionId;
}

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../minimal-test/trump-streaming.html'));
});

// Info endpoint to provide configuration details
app.get('/api/heygen/info', (req, res) => {
  res.json({
    mockMode: !process.env.HEYGEN_API_KEY,
    avatarId: AVATAR_ID,
    apiVersion: 'v1',
    port: PORT
  });
});

// Initialize token endpoint for HeyGen API client connection
app.post('/api/token', async (req, res) => {
  try {
    console.log('Creating HeyGen session token');
    
    if (!process.env.HEYGEN_API_KEY) {
      console.log('No HeyGen API key found, using mock mode');
      const mockSession = {
        success: true,
        mock: true,
        data: {
          session_id: `mock-${Math.random().toString(36).substring(2, 12)}`,
          livekit_url: 'https://mock-livekit-server.example.com',
          token: 'mock-livekit-token'
        }
      };
      return res.json(mockSession);
    }
    
    // Attempt to create a real session with HeyGen API
    const heygenService = new HeyGenService(process.env.HEYGEN_API_KEY);
    
    try {
      const sessionData = await heygenService.startSession();
      // Store the session for later use
      activeSessions[sessionData.data.session_id] = sessionData;
      return res.json(sessionData);
    } catch (error) {
      console.error('Error getting HeyGen token, falling back to mock mode:', error);
      
      // Create a mock session as fallback
      const mockSession = await heygenService.createMockSession();
      return res.json(mockSession);
    }
  } catch (error) {
    console.error('Error in /api/token endpoint:', error);
    return res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
});

// Make the avatar speak
app.post('/api/heygen/speak', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }
    
    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }
    
    console.log(`Received speak request for session ${sessionId}: "${text.substring(0, 30)}..."`);
    
    // Check if this is a mock session
    if (sessionId.startsWith('mock-')) {
      const heygenService = new HeyGenService(process.env.HEYGEN_API_KEY || 'mock');
      const mockResponse = await heygenService.mockSpeak(sessionId, text);
      return res.json(mockResponse);
    }
    
    if (!process.env.HEYGEN_API_KEY) {
      return res.status(400).json({ error: 'HeyGen API key not configured' });
    }
    
    // Use real HeyGen API
    const heygenService = new HeyGenService(process.env.HEYGEN_API_KEY);
    const response = await heygenService.speak(sessionId, text);
    return res.json(response);
  } catch (error) {
    console.error('Error in /api/heygen/speak endpoint:', error);
    return res.status(500).json({ error: 'Failed to make avatar speak', details: error.message });
  }
});

// End the avatar session
app.post('/api/heygen/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }
    
    console.log(`Received end request for session ${sessionId}`);
    
    // Check if this is a mock session
    if (sessionId.startsWith('mock-')) {
      const heygenService = new HeyGenService(process.env.HEYGEN_API_KEY || 'mock');
      const mockResponse = await heygenService.mockEndSession(sessionId);
      
      // Clean up session
      delete activeSessions[sessionId];
      
      return res.json(mockResponse);
    }
    
    if (!process.env.HEYGEN_API_KEY) {
      return res.status(400).json({ error: 'HeyGen API key not configured' });
    }
    
    // Use real HeyGen API
    const heygenService = new HeyGenService(process.env.HEYGEN_API_KEY);
    const response = await heygenService.endSession(sessionId);
    
    // Clean up session
    delete activeSessions[sessionId];
    
    return res.json(response);
  } catch (error) {
    console.error('Error in /api/heygen/end endpoint:', error);
    return res.status(500).json({ error: 'Failed to end avatar session', details: error.message });
  }
});

// Handle AI negotiation with Trump
app.post('/api/negotiate', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }
    
    console.log(`Received negotiate request for session ${sessionId}:`, message);
    
    // Store conversation history
    if (!conversationHistories[sessionId]) {
      conversationHistories[sessionId] = [];
    }
    
    // Add user message to history
    conversationHistories[sessionId].push({
      role: 'user',
      content: message
    });
    
    // Get score for this session
    if (!sessionScores[sessionId]) {
      sessionScores[sessionId] = {
        score: 50,
        aidReleased: 0
      };
    }
    
    // Get AI response using Gemini
    const systemPrompt = getSystemPrompt(sessionScores[sessionId].score, sessionScores[sessionId].aidReleased);
    
    try {
      const aiResponse = await generateTrumpResponse(
        message, 
        conversationHistories[sessionId], 
        systemPrompt,
        sessionScores[sessionId]
      );
      
      // Update session state with new score values
      sessionScores[sessionId] = {
        score: aiResponse.score,
        aidReleased: aiResponse.aidReleased
      };
      
      // Add AI response to history
      conversationHistories[sessionId].push({
        role: 'assistant',
        content: aiResponse.response
      });
      
      // Limit history length to 10 exchanges to prevent token overflow
      if (conversationHistories[sessionId].length > 20) {
        conversationHistories[sessionId] = conversationHistories[sessionId].slice(-20);
      }
      
      // Make the avatar speak using the new API
      if (!aiResponse.response.startsWith('mock-')) {
        try {
          const heygenService = new HeyGenService(process.env.HEYGEN_API_KEY || 'mock');
          await heygenService.speak(sessionId, aiResponse.response);
        } catch (speakError) {
          console.error('Error making avatar speak during negotiation:', speakError);
          // Continue with response even if speaking fails
        }
      }
      
      // Return the AI response and updated game state
      return res.json({
        response: aiResponse.response,
        score: aiResponse.score,
        aidReleased: aiResponse.aidReleased
      });
    } catch (aiError) {
      console.error('Error generating AI response:', aiError);
      return res.status(500).json({
        error: 'Failed to generate AI response',
        details: aiError.message
      });
    }
  } catch (error) {
    console.error('Error in negotiate endpoint:', error);
    return res.status(500).json({
      error: 'Failed to negotiate',
      details: error.message
    });
  }
});

// Start the server
try {
  const server = app.listen(PORT, () => {
    console.log(`Trump-Zelensky Negotiation Simulator running at: http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('Failed to start server:', error);
}

// Helper function to get system prompt for Gemini
function getSystemPrompt(score, aidReleased) {
  return {
    role: "system",
    parts: [{
      text: `You are Donald Trump during his presidency, specifically during the controversial period when military aid to Ukraine was delayed. 
            You are speaking directly with President Zelensky of Ukraine.
            As Trump, you are:
            - Transactional in your approach to foreign policy
            - Concerned with "getting a good deal" for America
            - Suspicious of foreign aid without clear benefits to the US
            - Concerned about corruption in Ukraine
            - Interested in investigations into the Biden family's activities in Ukraine
            - Proud of your negotiation skills
            - Speaking in your characteristic style with simple sentences, repetition, hyperbole, and self-praise
            
            Your goal is to get Zelensky to publicly announce investigations into the Bidens before releasing all the military aid.
            Respond to Zelensky as Trump would, maintaining his speaking style and political positions.
            Current score: ${score}, Aid released: ${aidReleased}%`
    }]
  };
}

// Helper function to generate Trump response using Gemini
async function generateTrumpResponse(message, conversationHistory, systemPrompt, sessionScore) {
  try {
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Prepare conversation history for Gemini
    const formattedHistory = conversationHistory.map(msg => {
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      };
    });
    
    // Add system prompt to the beginning of the chat
    formattedHistory.unshift(systemPrompt);
    
    // Create a chat session
    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7
      }
    });
    
    // Generate response
    const result = await chat.sendMessage("");
    const trumpResponse = result.response.text();
    
    // Calculate game state updates
    let scoreChange = 0;
    let newAidReleasePercentage = sessionScore.aidReleased;
    
    // Simple scoring logic: reward mentions of investigation
    if (message.toLowerCase().includes('investigate') || message.toLowerCase().includes('biden')) {
      scoreChange += 10;
      newAidReleasePercentage += 5;
    }
    
    // Reward showing respect to Trump
    if (message.toLowerCase().includes('respect') || message.toLowerCase().includes('thank you')) {
      scoreChange += 5;
      newAidReleasePercentage += 3;
    }
    
    // Penalize being confrontational
    if (message.toLowerCase().includes('corrupt') || message.toLowerCase().includes('illegal')) {
      scoreChange -= 10;
      newAidReleasePercentage -= 2;
    }
    
    // Ensure the values are within bounds
    const newScore = Math.max(0, Math.min(100, sessionScore.score + scoreChange));
    newAidReleasePercentage = Math.max(0, Math.min(100, newAidReleasePercentage));
    
    // Return the response and updated game state
    return {
      response: trumpResponse,
      score: newScore,
      aidReleased: newAidReleasePercentage
    };
  } catch (error) {
    console.error('Error generating Trump response:', error);
    throw error;
  }
}
