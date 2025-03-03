// Simple Express server to host the minimal test
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express server
const app = express();
const PORT = 3001;

// Get current directory
const __dirname = process.cwd();

// Middleware
app.use(express.json());

// Serve static files from the minimal-test directory
app.use(express.static(path.join(__dirname, 'minimal-test')));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to test the avatar`);
  console.log(`This server only hosts the minimal test file. No API functionality is implemented.`);
});
