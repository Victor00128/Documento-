// debug and validation utils
import { ChatMessage, Sender } from "../types";

export class ChatValidator {
  static validateRoleSequence(messages: ChatMessage[]): {
    isValid: boolean;
    errors: string[];
    fixes: string[];
  } {
    const errors: string[] = [];
    const fixes: string[] = [];

    if (messages.length === 0) {
      return { isValid: true, errors, fixes };
    }

    // check for consecutive same roles
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].sender === messages[i - 1].sender) {
        errors.push(`Consecutive ${messages[i].sender} messages at position ${i}`);
        fixes.push("Remove duplicate or add missing response");
      }
    }

    // check if starts with user (for API compatibility)
    const nonInitialMessages = messages.filter(m => m.id !== "initial-message");
    if (nonInitialMessages.length > 0 && nonInitialMessages[0].sender !== Sender.User) {
      errors.push("Conversation should start with user message");
      fixes.push("Add user message at beginning or remove AI message");
    }

    return {
      isValid: errors.length === 0,
      errors,
      fixes
    };
  }

  static cleanHistoryForAPI(messages: ChatMessage[]): any[] {
    const cleaned = messages
      .filter(m =>
        m.id !== "initial-message" &&
        m.text.trim() &&
        m.text !== "..." &&
        !m.fileInfo
      )
      .map(msg => ({
        role: msg.sender === Sender.User ? "user" : "model",
        parts: [{ text: msg.text.trim() }]
      }));

    // fix role alternation
    const fixed = [];
    let expectedRole = "user";

    for (const msg of cleaned) {
      if (msg.role === expectedRole) {
        fixed.push(msg);
        expectedRole = expectedRole === "user" ? "model" : "user";
      }
    }

    return fixed;
  }

  static logConversationState(conversationId: string, messages: ChatMessage[]) {
    const validation = this.validateRoleSequence(messages);

    console.group(`🔍 Chat Debug - ${conversationId}`);
    console.log("Total messages:", messages.length);
    console.log("Valid sequence:", validation.isValid);

    if (!validation.isValid) {
      console.warn("❌ Errors found:", validation.errors);
      console.log("💡 Fixes:", validation.fixes);
    }

    // show last few messages
    const recent = messages.slice(-5);
    console.log("Recent messages:", recent.map(m => `${m.sender}: ${m.text.substring(0, 50)}...`));
    console.groupEnd();
  }

  static detectAPIError(error: any): string {
    if (typeof error === "string") {
      if (error.includes("First content should be with role 'user'")) {
        return "Role sequence error - conversation must start with user message";
      }
      if (error.includes("quota")) {
        return "API quota exceeded - check your usage";
      }
      if (error.includes("API key")) {
        return "API key problem - check your configuration";
      }
    }

    if (error?.message) {
      return this.detectAPIError(error.message);
    }

    return "Unknown error - check console for details";
  }
}

export const debugChat = {
  enabled: import.meta.env.DEV,

  log: (...args: any[]) => {
    if (debugChat.enabled) {
      console.log("[Chat Debug]", ...args);
    }
  },

  warn: (...args: any[]) => {
    if (debugChat.enabled) {
      console.warn("[Chat Debug]", ...args);
    }
  },

  error: (...args: any[]) => {
    console.error("[Chat Debug]", ...args);
  },

  validateMessage: (message: ChatMessage) => {
    if (!message.text?.trim() && !message.fileInfo) {
      debugChat.warn("Empty message detected:", message.id);
      return false;
    }
    return true;
  },

  checkAPICompatibility: (history: any[]) => {
    if (history.length === 0) return true;

    if (history[0]?.role !== "user") {
      debugChat.error("API Error: History must start with user role");
      return false;
    }

    // check alternating roles
    for (let i = 1; i < history.length; i++) {
      const current = history[i].role;
      const previous = history[i - 1].role;

      if (current === previous) {
        debugChat.error(`Role conflict at position ${i}: ${current} follows ${previous}`);
        return false;
      }
    }

    return true;
  }
};
