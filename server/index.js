import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { TrumpAgent, RefereeAgent } from './prompts/agents.js';
import GameEngine from './game-engine/GameEngine.js';
import heygenService from './services/heygenService.js';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
app.use(express.static(join(__dirname, '../client/dist')));

// Store active sessions
const activeSessions = new Map();

// Endpoint to get the Gemini API key
app.get('/api/config/gemini-key', (req, res) => {
  // Only return the key if it exists
  if (!process.env.GEMINI_API_KEY) {
    return res.status(404).json({ error: 'API key not configured' });
  }
  
  // Return the API key
  res.json({ apiKey: process.env.GEMINI_API_KEY });
});

// New endpoint for HeyGen API configuration
app.get('/api/config/heygen-info', (req, res) => {
  if (!process.env.HEYGEN_API_KEY) {
    return res.status(404).json({ error: 'HeyGen API key not configured' });
  }
  
  res.json({ 
    configured: true 
  });
});

// Create a new game session with HeyGen integration
app.post('/api/session/start', async (req, res) => {
  try {
    const sessionId = crypto.randomUUID();
    const gameEngine = new GameEngine(TrumpAgent, RefereeAgent);
    
    // Create HeyGen avatar session
    let heygenData = null;
    try {
      heygenData = await heygenService.createSession();
    } catch (heygenError) {
      console.error('HeyGen session creation failed:', heygenError);
      // Continue without HeyGen if it fails
    }
    
    // Store session info
    activeSessions.set(sessionId, { 
      gameEngine,
      heygenSessionId: heygenData?.sessionId,
      lastActivity: Date.now()
    });
    
    res.json({
      sessionId,
      heygenInfo: heygenData
    });
  } catch (error) {
    console.error('Failed to start session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Process user input in existing session with HeyGen integration
app.post('/api/session/:sessionId/interact', async (req, res) => {
  try {
    const sessionInfo = activeSessions.get(req.params.sessionId);
    
    if (!sessionInfo) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const { gameEngine, heygenSessionId } = sessionInfo;
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    // Update last activity timestamp
    sessionInfo.lastActivity = Date.now();
    activeSessions.set(req.params.sessionId, sessionInfo);
    
    // Process input with game engine
    const result = await gameEngine.processInput(text);
    
    // Make the HeyGen avatar speak if available
    if (heygenSessionId) {
      try {
        await heygenService.speakText(heygenSessionId, result.aiResponse);
      } catch (heygenError) {
        console.error('HeyGen speech generation failed:', heygenError);
        // Continue even if HeyGen fails
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Interaction failed:', error);
    res.status(500).json({ error: 'Interaction failed' });
  }
});

// New endpoint to end a session and clean up resources
app.post('/api/session/:sessionId/end', async (req, res) => {
  try {
    const sessionInfo = activeSessions.get(req.params.sessionId);
    
    if (!sessionInfo) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // End HeyGen session if available
    if (sessionInfo.heygenSessionId) {
      await heygenService.endSession(sessionInfo.heygenSessionId);
    }
    
    // Remove session from active sessions
    activeSessions.delete(req.params.sessionId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to end session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// New endpoint for HeyGen avatar token
app.get('/api/heygen/token', async (req, res) => {
  try {
    if (!process.env.HEYGEN_API_KEY) {
      return res.status(404).json({ error: 'HeyGen API key not configured' });
    }
    
    // Create a new HeyGen session
    const heygenData = await heygenService.createSession();
    
    if (!heygenData) {
      throw new Error('Failed to create HeyGen session');
    }
    
    // Return the token data with exact property names expected by LiveKit client
    res.json({
      token: heygenData.token,
      roomName: heygenData.roomName,
      wsUrl: heygenData.wsUrl,
      sessionId: heygenData.sessionId  // Added sessionId for direct access
    });
  } catch (error) {
    console.error('Failed to get HeyGen token:', error);
    res.status(500).json({ error: 'Failed to get HeyGen token' });
  }
});

// New endpoint for HeyGen avatar speech
app.post('/api/heygen/speak', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    
    if (!sessionId || !text) {
      return res.status(400).json({ error: 'Missing sessionId or text' });
    }
    
    const result = await heygenService.speakText(sessionId, text);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Failed to make avatar speak:', error);
    res.status(500).json({ error: 'Failed to make avatar speak' });
  }
});

// New endpoint to end HeyGen avatar session
app.post('/api/heygen/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    const success = await heygenService.endSession(sessionId);
    res.json({ success });
  } catch (error) {
    console.error('Failed to end HeyGen session:', error);
    res.status(500).json({ error: 'Failed to end HeyGen session' });
  }
});

// Session cleanup after inactivity (mock implementation)
const cleanupSessions = () => {
  const now = Date.now();
  const expirationTime = 30 * 60 * 1000; // 30 minutes
  
  activeSessions.forEach(async (sessionInfo, sessionId) => {
    if (now - sessionInfo.lastActivity > expirationTime) {
      // End HeyGen session if available
      if (sessionInfo.heygenSessionId) {
        await heygenService.endSession(sessionInfo.heygenSessionId);
      }
      
      // Remove session from active sessions
      activeSessions.delete(sessionId);
    }
  });
};

// Run cleanup every 10 minutes
setInterval(cleanupSessions, 10 * 60 * 1000);

// Catch-all handler for SPA in production
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
