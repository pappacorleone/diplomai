// Basic Express server to host the minimal test
const express = require('express');
const path = require('path');

// Create Express server
const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.static('minimal-test'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to test the avatar`);
  console.log(`This server only hosts the minimal test file. No API functionality is implemented.`);
});
