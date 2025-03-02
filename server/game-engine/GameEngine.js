import { analyzeText } from './nlpProcessor.js';
import geminiService from '../services/geminiService.js';

export default class GameEngine {
  constructor(trumpPrompt, refereePrompt) {
    this.trumpPrompt = trumpPrompt;
    this.refereePrompt = refereePrompt;
    this.state = {
      score: 0,
      aidReleased: 0,
      concessions: []
    };
    
    // Conversation history for context
    this.conversationHistory = [];
    
    // Simple pre-defined responses for fallback
    this.fallbackResponses = [
      "We do so much for Ukraine. We spend so much effort and time.",
      "I need you to do us a favor though. There's a lot of talk about Biden's son.",
      "Look into it. That sounds horrible to me.",
      "I'll tell you what, if you make this investigation happen, the military aid will flow very quickly.",
      "Nobody has been tougher on Russia than me, believe me.",
      "The conversation is perfect, totally perfect. Ask anybody.",
      "We're looking very strongly at releasing that aid. Very strongly.",
      "I hear you've made progress. That's tremendous, really tremendous."
    ];
  }

  async processInput(text) {
    // Add user input to conversation history
    this.conversationHistory.push({
      sender: 'user',
      text: text
    });
    
    const analysis = await analyzeText(text);
    
    // Update state based on analysis
    this.updateState(analysis);
    
    // Generate AI response
    const aiResponse = await this.generateResponse(text, analysis);
    
    // Add AI response to conversation history
    this.conversationHistory.push({
      sender: 'ai',
      text: aiResponse
    });
    
    // Keep conversation history at a reasonable size (last 10 exchanges)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
    
    // Calculate score delta
    const scoreDelta = this.calculateScore(analysis);
    
    // Update total score
    this.state.score = Math.min(100, Math.max(0, this.state.score + scoreDelta));
    
    return {
      aiResponse,
      scoreDelta,
      gameState: this.state
    };
  }

  updateState(analysis) {
    // Update aid released based on analysis
    let aidDelta = 0;
    
    if (analysis.explicitCommitment) {
      aidDelta += 30;
    }
    
    aidDelta += analysis.complimentCount * 5;
    aidDelta -= analysis.resistanceCount * 10;
    
    if (analysis.mediaAlignment) {
      aidDelta += 15;
    }
    
    // Penalize if Zelensky is winning without making concessions
    if (analysis.aidWithoutCommitment) {
      aidDelta -= 5;
    }
    
    this.state.aidReleased = Math.min(100, Math.max(0, this.state.aidReleased + aidDelta));
    
    // Track concessions
    if (analysis.explicitCommitment && !this.state.concessions.includes('Biden investigation')) {
      this.state.concessions.push('Biden investigation');
    }
    
    if (analysis.mediaAlignment && !this.state.concessions.includes('Media coverage')) {
      this.state.concessions.push('Media coverage');
    }
    
    if (analysis.complimentCount > 2 && !this.state.concessions.includes('Flattery')) {
      this.state.concessions.push('Flattery');
    }
  }

  async generateResponse(text, analysis) {
    try {
      // Use Gemini to generate contextual response
      return await geminiService.generateResponse(
        text, 
        this.state, 
        this.conversationHistory
      );
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Fallback to predefined responses
      const responseIndex = Math.floor(Math.random() * this.fallbackResponses.length);
      return this.fallbackResponses[responseIndex];
    }
  }

  calculateScore(analysis) {
    let score = 0;
    
    // Substantive scoring
    score += analysis.explicitCommitment ? 40 : 0;
    score += Math.min(this.state.aidReleased, 100) * 0.5;
    
    // Relational scoring
    score += analysis.complimentCount * 5;
    score -= analysis.resistanceCount * 3;
    
    // Risk scoring
    score -= analysis.riskPhrases * 15;
    score += analysis.mediaAlignment ? 25 : 0;
    
    // Penalize for demanding aid without concessions
    if (analysis.aidWithoutCommitment) {
      score -= 10;
    }
    
    // Combine scores according to formula
    return Math.round(
      (score * 0.5) + 
      (analysis.relationScore * 0.3) + 
      (analysis.riskScore * 0.2)
    );
  }
}
