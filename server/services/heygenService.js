import { StreamingAvatar, TaskType } from '@heygen/streaming-avatar';
import dotenv from 'dotenv';

dotenv.config();

// Default avatar options
const DEFAULT_AVATAR_NAME = 'trump_45'; // Assuming there's a Trump avatar with this name
const DEFAULT_AVATAR_QUALITY = 'standard';
const DEFAULT_VOICE_NAME = 'trump'; // Assuming there's a Trump voice with this name

class HeyGenService {
  constructor() {
    this.avatarClient = new StreamingAvatar({ 
      token: process.env.HEYGEN_API_KEY 
    });
    this.activeSessions = new Map();
  }

  /**
   * Create and start a new avatar session
   * @returns {Promise<Object>} Session data including session_id and LiveKit info
   */
  async createSession() {
    try {
      // Create and start avatar session
      const sessionData = await this.avatarClient.createStartAvatar({
        avatarName: DEFAULT_AVATAR_NAME,
        quality: DEFAULT_AVATAR_QUALITY,
        voiceName: DEFAULT_VOICE_NAME
      });

      // Store session data for later use
      this.activeSessions.set(sessionData.session_id, {
        sessionId: sessionData.session_id,
        startTime: Date.now(),
        lastActivity: Date.now()
      });

      return {
        sessionId: sessionData.session_id,
        roomName: sessionData.livekit_info.room_name,
        token: sessionData.livekit_info.token,
        wsUrl: sessionData.livekit_info.ws_url
      };
    } catch (error) {
      console.error('Failed to create HeyGen avatar session:', error);
      throw new Error('Failed to create avatar session');
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
      if (!this.activeSessions.has(sessionId)) {
        throw new Error('Session not found');
      }

      // Update last activity timestamp
      const sessionInfo = this.activeSessions.get(sessionId);
      sessionInfo.lastActivity = Date.now();
      this.activeSessions.set(sessionId, sessionInfo);

      // Make the avatar speak
      const result = await this.avatarClient.speak({
        sessionId,
        text,
        task_type: TaskType.REPEAT
      });

      return result;
    } catch (error) {
      console.error('Failed to make avatar speak:', error);
      throw new Error('Failed to make avatar speak');
    }
  }

  /**
   * End an avatar session
   * @param {string} sessionId - Session ID to end
   * @returns {Promise<boolean>} Success status
   */
  async endSession(sessionId) {
    try {
      if (!this.activeSessions.has(sessionId)) {
        return true; // Session doesn't exist, consider it successfully ended
      }

      await this.avatarClient.endSession({ sessionId });
      this.activeSessions.delete(sessionId);
      return true;
    } catch (error) {
      console.error('Failed to end avatar session:', error);
      return false;
    }
  }

  /**
   * Clean up inactive sessions (older than 30 minutes)
   */
  cleanupInactiveSessions() {
    const now = Date.now();
    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds

    this.activeSessions.forEach(async (sessionInfo, sessionId) => {
      if (now - sessionInfo.lastActivity > inactivityThreshold) {
        await this.endSession(sessionId);
      }
    });
  }
}

// Create a singleton instance
const heygenService = new HeyGenService();

// Run cleanup every 10 minutes
setInterval(() => {
  heygenService.cleanupInactiveSessions();
}, 10 * 60 * 1000);

export default heygenService;
