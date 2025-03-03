// ES Module Implementation of Trump Avatar Negotiation Simulator
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import HeyGenService from './heygenService.js';

// Load environment variables from .env file
dotenv.config();

// Set constants
const PORT = process.env.PORT || 3003;
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

// Token endpoint - use the real HeyGen API when API key is available
app.get('/api/heygen/token', async (req, res) => {
  try {
    // Check if we have a HeyGen API key
    if (!process.env.HEYGEN_API_KEY) {
      console.log('No HeyGen API key found, using mock mode');
      // Fall back to mock mode if no API key
      const sessionId = createMockSession();
      
      res.json({
        sessionId,
        isMock: true,
        // Use a publicly accessible image URL that won't have CORS issues
        mockAvatarUrl: 'https://i.imgur.com/O5N4qbs.jpg'
      });
      return;
    }

    console.log('Creating HeyGen session with avatar ID:', AVATAR_ID);
    // If we have a HeyGen API key, create a real session
    try {
      const sessionData = await heygenService.createSession();
      console.log('HeyGen session created successfully:', sessionData.sessionId);
      const sessionId = sessionData.sessionId;

      // Store session in our active sessions
      activeSessions.set(sessionId, {
        sessionId: sessionId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        gameState: { score: 0, aidReleased: 0, concessions: [] }
      });

      // Use real HeyGen mode
      res.json({
        sessionId: sessionId,
        isMock: false,
        roomName: sessionData.roomName,
        token: sessionData.token,
        wsUrl: sessionData.wsUrl
      });
    } catch (heygenError) {
      console.error('HeyGen API Error Details:', heygenError);
      if (heygenError.response) {
        console.error('HeyGen API Response:', heygenError.response.data);
      }
      throw heygenError;
    }
  } catch (error) {
    console.error('Error creating session:', error);
    
    // Fall back to mock mode if an error occurs
    try {
      console.log('Falling back to mock mode due to error');
      const sessionId = createMockSession();
      
      res.json({
        sessionId,
        isMock: true,
        mockAvatarUrl: 'https://i.imgur.com/O5N4qbs.jpg',
        error: 'Failed to create HeyGen session, falling back to mock mode'
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        error: 'Failed to create session (both real and mock)',
        details: error.message
      });
    }
  }
});

// When a session ends, clean up resources
app.post('/api/heygen/end', async (req, res) => {
  const { sessionId } = req.body;
  console.log(`Received request to end session: ${sessionId}`);
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }

  try {
    // Check if session exists
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // If session is not in mock mode, end the real HeyGen session
    if (!session.isMock && process.env.HEYGEN_API_KEY) {
      try {
        console.log(`Ending real HeyGen session: ${sessionId}`);
        await heygenService.endSession(sessionId);
        console.log(`Real HeyGen session ended: ${sessionId}`);
      } catch (error) {
        console.error(`Error ending HeyGen session ${sessionId}:`, error);
        // Continue with cleanup even if HeyGen API call fails
      }
    } else {
      console.log(`Ending mock session: ${sessionId}`);
    }

    // Remove session from active sessions
    activeSessions.delete(sessionId);
    conversationHistories.delete(sessionId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session', details: error.message });
  }
});

// Handle avatar speak requests
app.post('/api/heygen/speak', async (req, res) => {
  const { sessionId, text } = req.body;
  console.log(`Received speak request for session ${sessionId}: "${text.substring(0, 30)}..."`);
  
  if (!sessionId || !text) {
    return res.status(400).json({ error: 'Missing sessionId or text' });
  }

  try {
    // Get session information
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Update last activity timestamp
    session.lastActivity = Date.now();
    activeSessions.set(sessionId, session);

    // For mock mode, simply return success
    if (session.isMock || !process.env.HEYGEN_API_KEY) {
      console.log(`Using mock speak for session ${sessionId}`);
      return res.json({ 
        success: true, 
        isMock: true,
        taskId: 'mock-task-' + Math.random().toString(36).substring(2, 10)
      });
    }

    // For real mode, call the HeyGen API
    console.log(`Making avatar speak in session ${sessionId}`);
    const speakResult = await heygenService.speakText(sessionId, text);
    console.log(`Speak result for session ${sessionId}:`, speakResult);
    
    res.json({ 
      success: true,
      isMock: false,
      taskId: speakResult.task_id
    });
  } catch (error) {
    console.error('Error making avatar speak:', error);
    
    // Fall back to mock mode if an error occurs
    res.json({ 
      success: true, 
      isMock: true,
      taskId: 'mock-task-' + Math.random().toString(36).substring(2, 10),
      error: 'Failed to make avatar speak using HeyGen API, falling back to mock mode'
    });
  }
});

// Handle negotiation requests - simple mock version for now
app.post('/api/negotiate', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    console.log(`Negotiate request for session ${sessionId}:`, message);
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    // Check if session exists
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Update last activity
    session.lastActivity = Date.now();
    
    // Get or initialize conversation history
    const history = conversationHistories.get(sessionId) || [];
    conversationHistories.set(sessionId, history);
    
    // Add user's message to history
    history.push({ role: 'user', text: message });
    
    // Generate a simple mock response
    const trumpResponse = "Look, I don't know what's going on with the aid. We're looking into it. But Ukraine, tremendous corruption there, tremendous. Maybe you should look into the Bidens. People are saying very bad things about them. I need you to do us a favor though...";
    
    // Add Trump's response to history
    history.push({ role: 'model', text: trumpResponse });
    
    // Return the response
    res.json({
      response: trumpResponse,
      history: history,
      score: session.gameState.score,
      aidReleased: session.gameState.aidReleased
    });
  } catch (error) {
    console.error('Error in negotiation:', error);
    res.status(500).json({ 
      error: 'Failed to process negotiation',
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
