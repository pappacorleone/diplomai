// HeyGen API Service Module
import fetch from 'node-fetch';

const AVATAR_ID = 'Dexter_Lawyer_Sitting_public';
const VOICE_ID = 'en-US-TRUMP-1'; // Trump voice ID for HeyGen

class HeyGenService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.heygen.com/v1/';
    console.log('HeyGen Service initialized with base URL:', this.baseUrl);
    this.activeStreams = new Map();
  }

  /**
   * Get authenticated headers for API requests
   * @returns {Object} Headers with API key
   */
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  /**
   * Generate a streaming avatar token
   * @returns {Promise<Object>} The token response with LiveKit details
   */
  async createToken() {
    try {
      console.log('Creating HeyGen streaming token');
      const endpointUrl = `${this.baseUrl}streaming.create_token`;
      console.log('Using HeyGen API URL:', endpointUrl);
      
      // Create a streaming token using the create_token endpoint
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen API error during token creation:', errorText);
        console.error('Full request details:', {
          url: endpointUrl,
          headers: this.getAuthHeaders()
        });
        throw new Error(`HeyGen API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Token response:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Error creating HeyGen streaming token:', error);
      throw error;
    }
  }

  /**
   * Start a streaming avatar session
   * @returns {Promise<Object>} The session data
   */
  async startSession() {
    try {
      // First get a token
      const tokenResponse = await this.createToken();
      const token = tokenResponse.data.token;

      // Now create and start the avatar session
      const endpointUrl = `${this.baseUrl}streaming.start`;
      console.log('Using HeyGen API URL for session start:', endpointUrl);
      
      const requestBody = {
        avatar_id: AVATAR_ID,
        voice_id: VOICE_ID,
        token: token,
        background_color: "#ffffff",
        quality: "high"
      };
      
      console.log('Request body:', JSON.stringify(requestBody));
      
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen API error during session creation:', errorText);
        console.error('Full request details:', {
          url: endpointUrl,
          headers: this.getAuthHeaders(),
          body: requestBody
        });
        throw new Error(`HeyGen API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Session started successfully:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.error('Error starting HeyGen streaming session:', error);
      throw error;
    }
  }

  /**
   * Make the avatar speak
   * @param {string} sessionId The streaming avatar session ID
   * @param {string} text Text for the avatar to speak
   * @returns {Promise<Object>} Response data
   */
  async speak(sessionId, text) {
    try {
      console.log(`Making avatar speak for session ${sessionId}:`, text.substring(0, 30) + '...');
      const endpointUrl = `${this.baseUrl}streaming.speak`;
      console.log('Using HeyGen API URL:', endpointUrl);
      
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          text: text,
          session_id: sessionId,
          voice_id: VOICE_ID
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen API error during speak:', errorText);
        console.error('Full request details:', {
          url: endpointUrl,
          headers: this.getAuthHeaders(),
          body: {
            text: text,
            session_id: sessionId,
            voice_id: VOICE_ID
          }
        });
        throw new Error(`HeyGen API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error making avatar speak:', error);
      throw error;
    }
  }

  /**
   * End a streaming avatar session
   * @param {string} sessionId The streaming avatar session ID
   * @returns {Promise<Object>} Response data
   */
  async endSession(sessionId) {
    try {
      console.log(`Ending avatar session ${sessionId}`);
      const endpointUrl = `${this.baseUrl}streaming.stop`;
      console.log('Using HeyGen API URL:', endpointUrl);
      
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: sessionId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen API error during session end:', errorText);
        console.error('Full request details:', {
          url: endpointUrl,
          headers: this.getAuthHeaders(),
          body: {
            session_id: sessionId
          }
        });
        throw new Error(`HeyGen API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error ending avatar session:', error);
      throw error;
    }
  }

  /**
   * Create and configure a mock session
   * @returns {Promise<Object>} Mock session data
   */
  async createMockSession() {
    const mockSessionId = `mock-${Math.random().toString(36).substring(2, 12)}`;
    console.log(`Creating mock session: ${mockSessionId}`);
    
    return {
      success: true,
      mock: true,
      data: {
        session_id: mockSessionId,
        livekit_url: "https://mock-livekit-server.example.com",
        token: "mock-livekit-token"
      }
    };
  }

  /**
   * Mock function for avatar speaking
   * @param {string} sessionId Mock session ID
   * @param {string} text Text for avatar to speak
   * @returns {Promise<Object>} Mock response
   */
  async mockSpeak(sessionId, text) {
    console.log(`Mock avatar speaking for session ${sessionId}`);
    
    return {
      success: true,
      mock: true,
      data: {
        task_id: `mock-task-${Math.random().toString(36).substring(2, 8)}`
      }
    };
  }

  /**
   * Mock function for ending a session
   * @param {string} sessionId Mock session ID
   * @returns {Promise<Object>} Mock response
   */
  async mockEndSession(sessionId) {
    console.log(`Mock ending session ${sessionId}`);
    
    return {
      success: true,
      mock: true
    };
  }
}

export default HeyGenService;
