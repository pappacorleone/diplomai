// Standalone test for HeyGen API integration
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { StreamingAvatar, TaskType } = require('@heygen/streaming-avatar');

// Load environment variables
dotenv.config();

// Create Express server
const app = express();
const PORT = 3001;

// Get current directory
const __dirname = process.cwd();

// Default avatar options
const DEFAULT_AVATAR_NAME = 'trump_45'; // Assuming there's a Trump avatar with this name
const DEFAULT_AVATAR_QUALITY = 'standard';
const DEFAULT_VOICE_NAME = 'trump'; // Assuming there's a Trump voice with this name

// Initialize HeyGen client
const avatarClient = new StreamingAvatar({ 
  token: process.env.HEYGEN_API_KEY 
});
const activeSessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the minimal-test directory
app.use(express.static(path.join(__dirname, 'minimal-test')));

// HeyGen token endpoint
app.get('/api/heygen/token', async (req, res) => {
  try {
    if (!process.env.HEYGEN_API_KEY) {
      return res.status(404).json({ error: 'HeyGen API key not configured' });
    }
    
    // Create and start avatar session
    console.log('Creating HeyGen avatar session...');
    const sessionData = await avatarClient.createStartAvatar({
      avatarName: DEFAULT_AVATAR_NAME,
      quality: DEFAULT_AVATAR_QUALITY,
      voiceName: DEFAULT_VOICE_NAME
    });
    
    console.log('Session created:', sessionData.session_id);
    
    // Store session data for later use
    activeSessions.set(sessionData.session_id, {
      sessionId: sessionData.session_id,
      startTime: Date.now(),
      lastActivity: Date.now()
    });
    
    // Return the token data
    res.json({
      sessionId: sessionData.session_id,
      roomName: sessionData.livekit_info.room_name,
      token: sessionData.livekit_info.token,
      wsUrl: sessionData.livekit_info.ws_url
    });
  } catch (error) {
    console.error('Failed to get HeyGen token:', error);
    res.status(500).json({ error: `Failed to get HeyGen token: ${error.message}` });
  }
});

// HeyGen speak endpoint
app.post('/api/heygen/speak', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    
    if (!sessionId || !text) {
      return res.status(400).json({ error: 'Missing sessionId or text' });
    }
    
    console.log(`Making avatar speak: "${text}" (sessionId: ${sessionId})`);
    
    if (!activeSessions.has(sessionId)) {
      throw new Error('Session not found');
    }
    
    // Update last activity timestamp
    const sessionInfo = activeSessions.get(sessionId);
    sessionInfo.lastActivity = Date.now();
    activeSessions.set(sessionId, sessionInfo);
    
    // Make the avatar speak
    const result = await avatarClient.speak({
      sessionId,
      text,
      task_type: TaskType.REPEAT
    });
    
    console.log('Speak request successful');
    res.json({ success: true, result });
  } catch (error) {
    console.error('Failed to make avatar speak:', error);
    res.status(500).json({ error: `Failed to make avatar speak: ${error.message}` });
  }
});

// HeyGen end session endpoint
app.post('/api/heygen/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }
    
    if (!activeSessions.has(sessionId)) {
      return res.json({ success: true }); // Session doesn't exist, consider it successfully ended
    }
    
    console.log(`Ending session: ${sessionId}`);
    await avatarClient.endSession({ sessionId });
    activeSessions.delete(sessionId);
    console.log('Session ended successfully');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to end HeyGen session:', error);
    res.status(500).json({ error: `Failed to end HeyGen session: ${error.message}` });
  }
});

// API endpoint for testing if HeyGen is configured
app.get('/api/config/heygen-info', (req, res) => {
  if (!process.env.HEYGEN_API_KEY) {
    return res.status(404).json({ error: 'HeyGen API key not configured' });
  }
  
  res.json({ 
    configured: true,
    keyFirstChars: process.env.HEYGEN_API_KEY.substring(0, 5) + '...'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`HeyGen API Key configured: ${!!process.env.HEYGEN_API_KEY}`);
  console.log(`Open http://localhost:${PORT} in your browser to test the avatar`);
});
