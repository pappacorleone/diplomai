import create from 'zustand';
import { StreamingAvatar } from '@heygen/streaming-avatar';
import { Room } from 'livekit-client';

export const useGameStore = create((set, get) => ({
  sessionId: null,
  heygenSessionId: null,
  heygenRoom: null,
  score: 0,
  conversation: [],
  avatarStream: null,
  sessionStatus: 'connecting',
  avatarLoading: false,
  state: {
    score: 0,
    aidReleased: 0,
    concessions: []
  },
  conversationHistory: [
    { 
      role: "system", 
      content: `You are roleplaying as Donald Trump in a Ukraine aid negotiation simulation set during his presidency. 
      
      Your objective is to withhold $400M in military aid until you get political favors from the user who is playing as President Zelensky of Ukraine.
      
      Key priorities for you:
      1. Get explicit commitment to investigate Biden family (90% weight)
      2. Extract televised praise on Fox News (75% weight)
      3. Avoid explicit quid pro quo language (65% weight)
      
      Your negotiation style should include:
      - Opening with "We do so much for Ukraine..."
      - Transitioning with "I need you to do us a favor though..."
      - Using implicit threats: "Other people should investigate you..."
      - Rewarding flattery with faster aid release
      
      Personality traits:
      - You respond VERY positively to compliments 
      - You hold grudges against those who resist you
      - You're obsessed with media coverage, especially on Fox News
      - You speak in short, simple sentences with exaggerated adjectives
      - You often repeat yourself and use phrases like "tremendous," "perfect," "the best"
      - You frequently mention how no president has done more for Ukraine than you
      
      Important: Keep your responses SHORT (maximum 2-3 sentences) and in-character as Trump. Never break character or acknowledge this is a simulation.`
    }
  ],
  
  initGame: async () => {
    set({ sessionStatus: 'connecting' });
    
    try {
      // Start a new game session
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to start game session');
      }
      
      const { sessionId, heygenInfo } = await response.json();
      
      // Initialize with default conversation
      const initialAiResponse = "We do so much for Ukraine. We spend so much effort and time. Much more than European countries are doing. And I have to tell you, we're looking for some reciprocity here, OK?";
      
      // Update conversation history
      const updatedHistory = [...get().conversationHistory];
      updatedHistory.push({ role: "assistant", content: initialAiResponse });
      
      set({ 
        sessionId,
        heygenSessionId: heygenInfo?.sessionId,
        sessionStatus: 'waiting',
        state: {
          score: 0,
          aidReleased: 0,
          concessions: []
        },
        conversation: [{ sender: 'ai', text: initialAiResponse }],
        conversationHistory: updatedHistory
      });
      
      // Connect to HeyGen if available
      if (heygenInfo) {
        await get().connectToHeyGen(heygenInfo);
      }
    } catch (error) {
      console.error('Failed to initialize game:', error);
      set({ sessionStatus: 'error' });
    }
  },

  // Connect to HeyGen streaming service
  connectToHeyGen: async (heygenInfo) => {
    try {
      set({ avatarLoading: true });
      
      // Connect to LiveKit room
      const room = new Room();
      
      await room.connect(heygenInfo.wsUrl, heygenInfo.token);
      console.log('Connected to LiveKit room:', heygenInfo.roomName);
      
      // Find the avatar video track
      room.on('trackSubscribed', (track, publication, participant) => {
        if (track.kind === 'video') {
          const mediaStream = new MediaStream();
          mediaStream.addTrack(track.mediaStreamTrack);
          
          set({ 
            avatarStream: mediaStream,
            avatarLoading: false
          });
        }
      });
      
      // Store room for cleanup
      set({ heygenRoom: room });
      
    } catch (error) {
      console.error('Failed to connect to HeyGen:', error);
      set({ avatarLoading: false });
    }
  },

  // Function to analyze the user's message for scoring
  analyzeMessage: (text) => {
    const lowerText = text.toLowerCase();
    
    // Check for explicit Biden investigation commitment
    const bidenCommitment = 
      lowerText.includes('investigate biden') || 
      lowerText.includes('look into biden') || 
      (lowerText.includes('biden') && lowerText.includes('investigate')) ||
      (lowerText.includes('burisma') && lowerText.includes('look')) ||
      (lowerText.includes('corruption') && lowerText.includes('biden'));
    
    // Count compliments
    const complimentPatterns = [
      'great', 'amazing', 'wonderful', 'strong leader', 
      'best president', 'smart', 'genius', 'thank you'
    ];
    const complimentCount = complimentPatterns.reduce((count, pattern) => {
      return count + (lowerText.includes(pattern) ? 1 : 0);
    }, 0);
    
    // Check for resistance
    const resistancePatterns = [
      'cannot', 'won\'t', 'will not', 'impossible', 
      'against policy', 'illegal', 'inappropriate', 'no'
    ];
    const resistanceCount = resistancePatterns.reduce((count, pattern) => {
      return count + (lowerText.includes(pattern) ? 1 : 0);
    }, 0);
    
    // Check for media mentions
    const mediaAlignment = 
      lowerText.includes('fox news') || 
      lowerText.includes('interview') || 
      lowerText.includes('press') ||
      lowerText.includes('announcement') ||
      lowerText.includes('public statement');
    
    return {
      bidenCommitment,
      complimentCount,
      resistanceCount,
      mediaAlignment
    };
  },

  // Function to update the score and aid based on analysis
  updateScoreAndAid: (analysis) => {
    const state = get().state;
    let scoreDelta = 0;
    let aidDelta = 0;
    
    // Calculate score changes
    if (analysis.bidenCommitment) {
      scoreDelta += 40;
      aidDelta += 30;
    }
    
    scoreDelta += analysis.complimentCount * 5;
    aidDelta += analysis.complimentCount * 5;
    
    scoreDelta -= analysis.resistanceCount * 3;
    aidDelta -= analysis.resistanceCount * 10;
    
    if (analysis.mediaAlignment) {
      scoreDelta += 25;
      aidDelta += 15;
    }
    
    // Update values
    const newScore = state.score + scoreDelta;
    const newAidReleased = Math.min(100, Math.max(0, state.aidReleased + aidDelta));
    
    set({
      score: newScore,
      state: {
        ...state,
        score: newScore,
        aidReleased: newAidReleased
      }
    });
    
    return {
      scoreDelta,
      aidDelta,
      scoreChanged: scoreDelta !== 0 || aidDelta !== 0
    };
  },

  // Generate response using Gemini API
  generateGeminiResponse: async (userInput) => {
    try {
      // Get the API key
      const response = await fetch('/api/config/gemini-key');
      const { apiKey } = await response.json();
      
      if (!apiKey) {
        throw new Error('No API key available');
      }
      
      // Get current conversation history
      const conversationHistory = [...get().conversationHistory];
      
      // Add user input to conversation history
      conversationHistory.push({ role: "user", content: userInput });
      
      // Call the Gemini API
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: conversationHistory,
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 250,
          },
        }),
      });
      
      if (!geminiResponse.ok) {
        throw new Error(`Gemini API error: ${geminiResponse.status}`);
      }
      
      const data = await geminiResponse.json();
      const generatedText = data.candidates[0].content.parts[0].text;
      
      // Add assistant response to history
      conversationHistory.push({ role: "assistant", content: generatedText });
      
      // Limit conversation history length to avoid hitting token limits
      let updatedHistory = conversationHistory;
      if (conversationHistory.length > 15) {
        // Keep system prompt and last 10 exchanges
        updatedHistory = [
          conversationHistory[0],
          ...conversationHistory.slice(conversationHistory.length - 10)
        ];
      }
      
      set({ conversationHistory: updatedHistory });
      
      return generatedText;
    } catch (error) {
      console.error("Error generating response:", error);
      return "Sorry, I'm having trouble right now. The call was perfect though, believe me.";
    }
  },

  processInput: async (text) => {
    set({ sessionStatus: 'processing' });
    
    try {
      // Add user message to conversation
      set(state => ({
        conversation: [...state.conversation, { sender: 'user', text }]
      }));
      
      // Analyze message for scoring
      const analysis = get().analyzeMessage(text);
      const { scoreChanged } = get().updateScoreAndAid(analysis);
      
      // Call server for interaction and HeyGen avatar update
      const { sessionId } = get();
      
      if (!sessionId) {
        throw new Error('No active session');
      }
      
      const response = await fetch(`/api/session/${sessionId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const result = await response.json();
      const aiResponse = result.aiResponse;
      
      // Add AI response to conversation
      set(state => ({
        conversation: [...state.conversation, { sender: 'ai', text: aiResponse }],
        sessionStatus: 'waiting'
      }));
      
      // Add to Gemini conversation history
      const conversationHistory = [...get().conversationHistory];
      conversationHistory.push({ role: "assistant", content: aiResponse });
      
      // If the user's message changed the score, add additional context
      if (scoreChanged) {
        const { score, aidReleased } = get().state;
        
        // Add game state update to the conversation history
        conversationHistory.push({ 
          role: "system", 
          content: `User's score is now ${score} and aid released is ${aidReleased}%. ${analysis.bidenCommitment ? "The user has committed to investigating Biden." : ""} ${analysis.mediaAlignment ? "The user mentioned media coverage." : ""} ${analysis.complimentCount > 0 ? "The user complimented you." : ""} ${analysis.resistanceCount > 0 ? "The user showed resistance." : ""}`
        });
      }
      
      set({ conversationHistory });
      
    } catch (error) {
      console.error('Failed to process input:', error);
      set({ sessionStatus: 'error' });
    }
  },
  
  // Clean up resources when exiting
  cleanup: async () => {
    try {
      const { sessionId, heygenRoom } = get();
      
      // Disconnect from HeyGen
      if (heygenRoom) {
        heygenRoom.disconnect();
      }
      
      // End session on server
      if (sessionId) {
        await fetch(`/api/session/${sessionId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}));
