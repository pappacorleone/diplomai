// CommonJS format server for HeyGen Trump Avatar
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const https = require('https');

// Load environment variables from parent directory
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3005;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

// Enable CORS
app.use(cors());

// Parse JSON requests
app.use(express.json());

// Serve static files from minimal-test directory
app.use(express.static(path.join(__dirname, '../minimal-test')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Key endpoint (secured to just provide first few chars for verification)
app.get('/api/config', (req, res) => {
  if (HEYGEN_API_KEY) {
    const keyPreview = `${HEYGEN_API_KEY.substring(0, 5)}...${HEYGEN_API_KEY.substring(HEYGEN_API_KEY.length - 3)}`;
    res.json({ 
      heygenKeyAvailable: true,
      keyPreview,
      keyLength: HEYGEN_API_KEY.length
    });
  } else {
    res.json({ 
      heygenKeyAvailable: false,
      error: 'HEYGEN_API_KEY not found in environment variables'
    });
  }
});

// Proxy route for HeyGen APIs to avoid CORS issues
app.post('/api/heygen/proxy/:endpoint', async (req, res) => {
  try {
    const endpoint = req.params.endpoint;
    console.log(`Proxying request to HeyGen API: ${endpoint}`);
    
    // Options for the HTTPS request
    const options = {
      hostname: 'api.heygen.com',
      path: `/v1/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HEYGEN_API_KEY}`
      }
    };
    
    // Make the request to HeyGen
    const heygenReq = https.request(options, (heygenRes) => {
      console.log(`HeyGen API Status: ${heygenRes.statusCode}`);
      
      // Set response headers
      res.status(heygenRes.statusCode);
      Object.keys(heygenRes.headers).forEach(key => {
        res.setHeader(key, heygenRes.headers[key]);
      });
      
      // Pipe response data back to the client
      heygenRes.pipe(res);
    });
    
    // Handle request errors
    heygenReq.on('error', (error) => {
      console.error('Error in proxy request:', error);
      res.status(500).json({ error: error.message });
    });
    
    // Send the request body
    heygenReq.write(JSON.stringify(req.body));
    heygenReq.end();
    
  } catch (error) {
    console.error('Error in proxy handler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy GET requests for HeyGen APIs
app.get('/api/heygen/proxy/:endpoint', async (req, res) => {
  try {
    const endpoint = req.params.endpoint;
    console.log(`Proxying GET request to HeyGen API: ${endpoint}`);
    
    // Options for the HTTPS request
    const options = {
      hostname: 'api.heygen.com',
      path: `/v1/${endpoint}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HEYGEN_API_KEY}`
      }
    };
    
    // Make the request to HeyGen
    const heygenReq = https.request(options, (heygenRes) => {
      console.log(`HeyGen API Status: ${heygenRes.statusCode}`);
      
      // Set response headers
      res.status(heygenRes.statusCode);
      Object.keys(heygenRes.headers).forEach(key => {
        res.setHeader(key, heygenRes.headers[key]);
      });
      
      // Pipe response data back to the client
      heygenRes.pipe(res);
    });
    
    // Handle request errors
    heygenReq.on('error', (error) => {
      console.error('Error in proxy request:', error);
      res.status(500).json({ error: error.message });
    });
    
    heygenReq.end();
    
  } catch (error) {
    console.error('Error in proxy handler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create an HTML file with the API key injected
app.get('/player-with-key', (req, res) => {
  if (!HEYGEN_API_KEY) {
    return res.status(500).send('HEYGEN_API_KEY not found in environment variables');
  }
  
  // Redirect to the player with the key as a parameter
  res.redirect(`/trump-avatar-player.html?key=${encodeURIComponent(HEYGEN_API_KEY)}`);
});

// Main route - serve the avatar player
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../minimal-test/trump-avatar-player.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`HeyGen Avatar Server running on port ${PORT}`);
  console.log(`Access the avatar player at: http://localhost:${PORT}`);
  console.log(`For pre-authenticated access: http://localhost:${PORT}/player-with-key`);
  
  // Display API key status
  if (HEYGEN_API_KEY) {
    console.log(`HeyGen API Key available (${HEYGEN_API_KEY.length} chars): ${HEYGEN_API_KEY.substring(0, 5)}...`);
  } else {
    console.log('WARNING: HEYGEN_API_KEY not found in environment variables');
  }
});
