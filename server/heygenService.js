// HeyGen API Service Module
import fetch from 'node-fetch';
import crypto from 'crypto';

const AVATAR_ID = 'Dexter_Lawyer_Sitting_public';
const VOICE_ID = 'en-US-TRUMP-1'; // Trump voice ID for HeyGen

class HeyGenService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.heygen.com/v1';
    this.activeStreams = new Map();
  }

  // Generate authorization headers for HeyGen API
  getAuthHeaders() {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    return {
      'X-Heygen-Api-Key': this.apiKey,
      'X-Heygen-App-Id': 'streaming_avatar_api',
      'X-Heygen-Timestamp': timestamp,
      'X-Heygen-Nonce': nonce,
      'Content-Type': 'application/json'
    };
  }
  
  /**
   * Create and start a new avatar session
   * @returns {Promise<Object>} Session data including session_id and LiveKit info
   */
  async createSession() {
    try {
      console.log('Creating HeyGen streaming avatar session for:', AVATAR_ID);
      
      const response = await fetch(`${this.baseUrl}/streaming-avatar/create-start`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          avatar_name: AVATAR_ID,
          quality: 'standard'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('HeyGen API error response:', errorData);
        throw new Error(`HeyGen API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      console.log('HeyGen session created:', data.session_id);
      
      // Store session for later use
      this.activeStreams.set(data.session_id, {
        sessionId: data.session_id,
        startTime: Date.now(),
        lastActivity: Date.now()
      });
      
      return {
        sessionId: data.session_id,
        roomName: data.livekit_info.room_name,
        token: data.livekit_info.token,
        wsUrl: data.livekit_info.ws_url
      };
    } catch (error) {
      console.error('Failed to create HeyGen avatar session:', error);
      throw error;
    }
  }
  
  /**
   * Make the avatar speak the given text
   * @param {string} sessionId - Session ID
   * @param {string} text - Text for the avatar to speak
   * @returns {Promise<Object>} Result of the speak operation
   */
  async speakText(sessionId, text) {
    try {
      console.log(`Making avatar speak in session ${sessionId}: "${text.substring(0, 30)}..."`);
      
      if (!this.activeStreams.has(sessionId)) {
        throw new Error('Session not found');
      }
      
      // Update last activity timestamp
      const sessionInfo = this.activeStreams.get(sessionId);
      sessionInfo.lastActivity = Date.now();
      this.activeStreams.set(sessionId, sessionInfo);
      
      const response = await fetch(`${this.baseUrl}/streaming-avatar/speak`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: sessionId,
          text: text,
          task_type: 'REPEAT'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('HeyGen API error during speak:', errorData);
        throw new Error(`HeyGen API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      console.log('Avatar speaking task initiated:', data.task_id);
      return data;
    } catch (error) {
      console.error('Failed to make avatar speak:', error);
      throw error;
    }
  }
  
  /**
   * End an avatar session
   * @param {string} sessionId - Session ID to end
   * @returns {Promise<boolean>} Success status
   */
  async endSession(sessionId) {
    try {
      console.log(`Ending HeyGen session: ${sessionId}`);
      
      if (!this.activeStreams.has(sessionId)) {
        return true; // Session doesn't exist, consider it successfully ended
      }
      
      const response = await fetch(`${this.baseUrl}/streaming-avatar/end`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          session_id: sessionId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('HeyGen API error during session end:', errorData);
        throw new Error(`HeyGen API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      this.activeStreams.delete(sessionId);
      console.log(`Session ${sessionId} ended successfully`);
      return true;
    } catch (error) {
      console.error('Failed to end avatar session:', error);
      return false;
    }
  }
}

export default HeyGenService;
