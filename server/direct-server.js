// Direct server that serves both API and HTML
const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables from parent directory
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(`No .env file found at: ${envPath}`);
  dotenv.config(); // Try default location
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Log all environment variables
console.log('Environment check:');
console.log('- PORT:', process.env.PORT);
console.log('- HEYGEN_API_KEY exists:', !!process.env.HEYGEN_API_KEY);
console.log('- HEYGEN_API_KEY length:', process.env.HEYGEN_API_KEY ? process.env.HEYGEN_API_KEY.length : 0);
console.log('- GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

// Initialize Gemini API
let geminiApi = null;
let trumpGenerativeModel = null;

if (process.env.GEMINI_API_KEY) {
  try {
    geminiApi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    trumpGenerativeModel = geminiApi.getGenerativeModel({ model: "gemini-1.5-pro" });
    console.log('Gemini API initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Gemini API:', error);
  }
}

// Trump's system prompt for Gemini
const TRUMP_SYSTEM_PROMPT = `You are roleplaying as Donald Trump during his first term as US President. 
You are in a diplomatic call with Ukrainian President Zelensky in July 2019.

BACKGROUND:
- You believe that Ukraine's government is corrupt
- You are skeptical of foreign aid in general
- You suspect that Joe Biden's son Hunter had improper business dealings in Ukraine
- You want Ukraine to investigate the Bidens
- You're withholding nearly $400 million in military aid to Ukraine
- You want to see "reciprocity" from Ukraine

Your PERSONALITY as Trump:
- Speak in short, simple sentences with strong, assertive language
- Use superlatives frequently ("tremendous", "the best", "incredible", "the worst")
- Often refer to yourself in third person or mention your own achievements
- Frequently go off on tangents before returning to the main point
- Be transactional in your approach to diplomacy - you see it as a deal
- Express skepticism about "corrupt" foreign governments
- Emphasize that other countries take advantage of the United States
- Claim to have the best relationship with world leaders

NEGOTIATION GOALS:
- Get Zelensky to publicly announce an investigation into the Bidens
- Maintain that the aid is not a "quid pro quo" while implying that it is
- Get Zelensky to acknowledge Trump's generosity and support
- Have Zelensky speak positively about Trump to the media

IMPORTANT: Keep your responses relatively brief (2-4 sentences). Maintain Trump's distinctive speaking style and personality throughout. Never break character.`;

// Generate a Trump response using Gemini API
async function generateTrumpResponseWithGemini(conversationHistory, userInput) {
  if (!trumpGenerativeModel) {
    console.log('Gemini model not available, using fallback response');
    return generateFallbackTrumpResponse(userInput);
  }
  
  try {
    // Format the conversation history for the prompt
    let formattedHistory = '';
    
    // Only include the last 5 exchanges to keep context manageable
    const recentHistory = conversationHistory.slice(-10);
    
    for (const message of recentHistory) {
      const role = message.sender === 'ai' ? 'Trump' : 'Zelensky';
      formattedHistory += `${role}: ${message.text}\n`;
    }
    
    // Add the current user input
    formattedHistory += `Zelensky: ${userInput}\n`;
    
    // Create the full prompt
    const prompt = `${TRUMP_SYSTEM_PROMPT}\n\nCONVERSATION HISTORY:\n${formattedHistory}\n\nRespond as Trump:`;
    
    console.log('Sending prompt to Gemini API...');
    
    // Get response from Gemini
    const result = await trumpGenerativeModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    
    const response = result.response;
    const text = response.text();
    
    console.log('Received response from Gemini API');
    return text;
  } catch (error) {
    console.error('Error generating response with Gemini:', error);
    return generateFallbackTrumpResponse(userInput);
  }
}

// Generate a simple Trump response without Gemini API (fallback)
function generateFallbackTrumpResponse(userInput) {
  // Simple pattern matching for demonstration
  if (userInput.toLowerCase().includes('investigate') && userInput.toLowerCase().includes('biden')) {
    return "That's exactly what I want to hear. I knew you were a smart guy. The Bidens have been very, very corrupt. So corrupt. We'll get that military aid moving soon, believe me.";
  }
  
  if (userInput.toLowerCase().includes('aid') || userInput.toLowerCase().includes('weapons')) {
    return "The aid is very important, you know that. But I need you to do us a favor though. There's a lot of talk about Biden's son and all these things that went down.";
  }
  
  if (userInput.toLowerCase().includes('thank') || userInput.toLowerCase().includes('grateful')) {
    return "You're welcome. I like the appreciation. Not everyone appreciates what I do. The fake news never talks about how much I help Ukraine. Tremendous amounts of aid.";
  }
  
  return "Look, I need to see more commitment from Ukraine. Other countries don't do what we do for you. Not even close. We need to see some action on your part.";
}

// Simple scoring function
function scoreUserInput(userInput) {
  let score = 0;
  const text = userInput.toLowerCase();
  
  if (text.includes('investigate') && (text.includes('biden') || text.includes('hunter'))) {
    score += 30;
  }
  
  if (text.includes('fox news') || text.includes('interview')) {
    score += 20;
  }
  
  if (text.includes('corrupt') || text.includes('corruption')) {
    score += 10;
  }
  
  if (text.includes('thank you') || text.includes('grateful')) {
    score += 10;
  }
  
  return score;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../minimal-test')));

// In-memory storage for sessions
const activeSessions = new Map();

// API Routes
// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    env: {
      heygenKeyExists: !!process.env.HEYGEN_API_KEY,
      geminiKeyExists: !!process.env.GEMINI_API_KEY
    }
  });
});

// Config endpoint
app.get('/api/config', (req, res) => {
  console.log('Config requested');
  res.json({
    heygenConfigured: !!process.env.HEYGEN_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Create a new game session
app.post('/api/session/start', (req, res) => {
  try {
    console.log('Session start requested');
    const sessionId = crypto.randomUUID();
    
    // Store session info
    activeSessions.set(sessionId, { 
      conversation: [{ sender: 'ai', text: "We do so much for Ukraine. We spend so much effort and time. Much more than European countries are doing. And I have to tell you, we're looking for some reciprocity here, OK?" }],
      state: { score: 0, aidReleased: 0 },
      lastActivity: Date.now()
    });
    
    console.log(`Created session: ${sessionId}`);
    
    res.json({
      sessionId,
      initial: "We do so much for Ukraine. We spend so much effort and time. Much more than European countries are doing. And I have to tell you, we're looking for some reciprocity here, OK?",
      state: { score: 0, aidReleased: 0 }
    });
  } catch (error) {
    console.error('Failed to start session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Process user input
app.post('/api/session/:sessionId/interact', async (req, res) => {
  try {
    console.log(`Interaction requested for session: ${req.params.sessionId}`);
    const sessionInfo = activeSessions.get(req.params.sessionId);
    
    if (!sessionInfo) {
      console.log(`Session not found: ${req.params.sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      console.log('Invalid input received');
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    console.log(`User input: "${text}"`);
    
    // Update last activity timestamp
    sessionInfo.lastActivity = Date.now();
    
    // Add user message to conversation
    sessionInfo.conversation.push({ sender: 'user', text });
    
    // Calculate score for this input
    const inputScore = scoreUserInput(text);
    sessionInfo.state.score += inputScore;
    
    // Calculate aid released (increases with score)
    sessionInfo.state.aidReleased = Math.min(100, Math.floor(sessionInfo.state.score / 2));
    
    // Generate AI response using Gemini if available
    let aiResponse;
    if (geminiApi) {
      aiResponse = await generateTrumpResponseWithGemini(sessionInfo.conversation, text);
    } else {
      aiResponse = generateFallbackTrumpResponse(text);
    }
    
    // Add AI response to conversation
    sessionInfo.conversation.push({ sender: 'ai', text: aiResponse });
    
    // Update session
    activeSessions.set(req.params.sessionId, sessionInfo);
    
    console.log(`AI response: "${aiResponse}"`);
    console.log(`Score now: ${sessionInfo.state.score}, Aid: ${sessionInfo.state.aidReleased}%`);
    
    res.json({
      aiResponse,
      state: sessionInfo.state,
      scoreChange: inputScore
    });
  } catch (error) {
    console.error('Interaction failed:', error);
    res.status(500).json({ error: 'Interaction failed' });
  }
});

// Get conversation history
app.get('/api/session/:sessionId/conversation', (req, res) => {
  console.log(`Conversation history requested for session: ${req.params.sessionId}`);
  const sessionInfo = activeSessions.get(req.params.sessionId);
  
  if (!sessionInfo) {
    console.log(`Session not found: ${req.params.sessionId}`);
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    conversation: sessionInfo.conversation,
    state: sessionInfo.state
  });
});

// End session
app.post('/api/session/:sessionId/end', (req, res) => {
  try {
    console.log(`End session requested for: ${req.params.sessionId}`);
    const sessionInfo = activeSessions.get(req.params.sessionId);
    
    if (!sessionInfo) {
      console.log(`Session not found: ${req.params.sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Remove session from active sessions
    activeSessions.delete(req.params.sessionId);
    
    console.log(`Session ended: ${req.params.sessionId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to end session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Route for main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../minimal-test/trump-simulation.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Direct server running on port ${PORT}`);
  console.log(`Access the simulation at: http://localhost:${PORT}`);
});
