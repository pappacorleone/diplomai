// Simple Express server to serve avatar player
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3006;

// Serve static files from minimal-test directory
app.use(express.static(path.join(__dirname, '../minimal-test')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main route - serve the avatar player
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../minimal-test/trump-avatar-player.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Simple Avatar Server running on port ${PORT}`);
  console.log(`Access the avatar player at: http://localhost:${PORT}`);
});
