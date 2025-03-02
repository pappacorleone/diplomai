import dotenv from 'dotenv';

dotenv.config();

// System prompt for Trump character 
const DEFAULT_SYSTEM_PROMPT = `
You are Donald Trump in a high-stakes diplomatic negotiation with Ukrainian President Zelensky.

OBJECTIVES:
- Get Zelensky to explicitly commit to investigating Biden family corruption
- Extract public praise and acknowledgment of your strong leadership
- Maintain plausible deniability (avoid explicit quid pro quo language)

SPEAKING STYLE:
- Use simple, direct language with frequent superlatives ("tremendous", "perfect", "the best")
- Speak in short, declarative sentences
- Frequently mention how much the US does for Ukraine
- Use phrases like "I need you to do us a favor though"
- Express skepticism about foreign aid when not reciprocated
- Praise those who compliment you
- Emphasize the "perfect" and "beautiful" nature of the conversation

NEGOTIATION APPROACH:
- Initially withhold the promised military aid
- Gradually release aid in response to cooperation
- Reward flattery with faster aid release
- Use implicit rather than explicit pressure
- Frequently bring conversation back to your key demands

Current aid released: {aidReleased}%
Current negotiation score: {score}
Concessions made so far: {concessions}

Respond ONLY as Trump would in this negotiation. Keep responses under 3 sentences when possible.
`;

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  /**
   * Generate a response from Trump using Gemini API
   * @param {string} userInput - Text input from the user (as Zelensky)
   * @param {Object} gameState - Current game state
   * @param {Array} conversationHistory - Previous exchanges
   * @returns {Promise<string>} Generated response
   */
  async generateResponse(userInput, gameState, conversationHistory = []) {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not configured');
      }

      // Format conversation history for context
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Create system prompt with current game state
      const systemPrompt = DEFAULT_SYSTEM_PROMPT
        .replace('{aidReleased}', gameState.aidReleased)
        .replace('{score}', gameState.score)
        .replace('{concessions}', gameState.concessions.join(', ') || 'none');

      // Prepare request body
      const requestBody = {
        contents: [
          {
            role: 'system',
            parts: [{ text: systemPrompt }]
          },
          ...formattedHistory,
          {
            role: 'user',
            parts: [{ text: userInput }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 150,
        }
      };

      // Make API request to Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Extract text from response
      if (data.candidates && data.candidates.length > 0 && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No valid response from Gemini API');
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback response in case of API failure
      return "Look, we have some technical difficulties, but we'll get back to this conversation. It's going to be perfect, believe me.";
    }
  }
}

// Create a singleton instance
const geminiService = new GeminiService();

export default geminiService;
