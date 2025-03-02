import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
app.use(express.static(resolve(__dirname, '../client/dist')));

// Test the HeyGen API key
const testHeyGenKey = async () => {
  try {
    const response = await fetch('https://api.heygen.com/v1/avatar.list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`
      }
    });
    
    if (!response.ok) {
      console.error('HeyGen API key test failed:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('HeyGen API key test successful. Available avatars:', data.data?.length || 0);
    return true;
  } catch (error) {
    console.error('Error testing HeyGen API key:', error);
    return false;
  }
};

// Test endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/test/heygen', async (req, res) => {
  const isValid = await testHeyGenKey();
  res.json({ 
    valid: isValid, 
    key_preview: process.env.HEYGEN_API_KEY ? 
      `${process.env.HEYGEN_API_KEY.substring(0, 5)}...` : 
      'not set'
  });
});

// HeyGen avatar list endpoint
app.get('/api/avatars', async (req, res) => {
  try {
    const response = await fetch('https://api.heygen.com/v1/avatar.list', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch avatars',
        status: response.status
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Avatar list error:', error);
    res.status(500).json({ error: 'Failed to fetch avatars' });
  }
});

// Create a streaming session
app.post('/api/avatar/session', async (req, res) => {
  try {
    // Create a new streaming session
    const createResponse = await fetch('https://api.heygen.com/v1/streaming.new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`
      },
      body: JSON.stringify({
        version: 'v2',
        avatar_id: req.body.avatar_id || 'avatar_ad_4b7562234b2fc9' // Default avatar ID
      })
    });
    
    if (!createResponse.ok) {
      return res.status(createResponse.status).json({
        error: 'Failed to create streaming session',
        status: createResponse.status
      });
    }
    
    const sessionData = await createResponse.json();
    
    // Start the session
    const startResponse = await fetch('https://api.heygen.com/v1/streaming.start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`
      },
      body: JSON.stringify({
        session_id: sessionData.session_id
      })
    });
    
    if (!startResponse.ok) {
      return res.status(startResponse.status).json({
        error: 'Failed to start streaming session',
        status: startResponse.status
      });
    }
    
    res.json(sessionData);
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Make the avatar speak
app.post('/api/avatar/speak', async (req, res) => {
  try {
    const { session_id, text } = req.body;
    
    if (!session_id || !text) {
      return res.status(400).json({ error: 'Missing session_id or text' });
    }
    
    const response = await fetch('https://api.heygen.com/v1/streaming.task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`
      },
      body: JSON.stringify({
        session_id,
        text,
        task_type: 'repeat'
      })
    });
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to make avatar speak',
        status: response.status
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Avatar speak error:', error);
    res.status(500).json({ error: 'Failed to make avatar speak' });
  }
});

// End a session
app.post('/api/avatar/end', async (req, res) => {
  try {
    const { session_id } = req.body;
    
    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id' });
    }
    
    const response = await fetch('https://api.heygen.com/v1/streaming.stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HEYGEN_API_KEY}`
      },
      body: JSON.stringify({
        session_id
      })
    });
    
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to end session',
        status: response.status
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Session end error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Simple server running on port ${PORT}`);
  
  // Test the HeyGen API key on startup
  const heygenValid = await testHeyGenKey();
  console.log('HeyGen API key status:', heygenValid ? 'Valid' : 'Invalid');
});
