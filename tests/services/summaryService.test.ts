import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  needsSummary,
  generateConversationSummary,
  createConversationSummary,
  getEnrichedContext,
  getEnrichedSystemInstruction,
  shouldCleanupSummary,
  extractTopics,
  SUMMARY_CONFIG,
} from "../../services/summaryService";
import {
  Conversation,
  ConversationSummary,
  ChatMessage,
  Sender,
  AIPersonality,
} from "../../types";

// Mock del servicio de Gemini
vi.mock("../../services/geminiService", () => ({
  generateContent: vi.fn(),
}));

// Helper para crear mensajes de prueba
const createTestMessage = (
  id: string,
  sender: Sender,
  text: string,
): ChatMessage => ({
  id,
  sender,
  text,
});

// Helper para crear conversaciones de prueba
const createTestConversation = (
  id: string,
  messageCount: number,
  personality: AIPersonality = "flash",
): Conversation => {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < messageCount; i++) {
    messages.push(
      createTestMessage(
        `msg-${i}`,
        i % 2 === 0 ? Sender.User : Sender.AI,
        `Message ${i}`,
      ),
    );
  }

  return {
    id,
    title: `Test Conversation ${id}`,
    messages,
    lastModified: Date.now(),
    personality,
  };
};

// Helper para crear resúmenes de prueba
const createTestSummary = (
  conversationId: string,
  messageCount: number,
  version: number = 1,
): ConversationSummary => ({
  id: `summary_${conversationId}_${Date.now()}`,
  conversationId,
  summary: `Summary for conversation ${conversationId}`,
  messageCount,
  lastUpdated: Date.now(),
  version,
});

describe("SummaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("needsSummary", () => {
    it("should return true when conversation has enough messages and no existing summary", () => {
      const conversation = createTestConversation("test-1", 15);
      const result = needsSummary(conversation);
      expect(result).toBe(true);
    });

    it("should return false when conversation has few messages", () => {
      const conversation = createTestConversation("test-1", 5);
      const result = needsSummary(conversation);
      expect(result).toBe(false);
    });

    it("should return true when conversation has grown significantly since last summary", () => {
      const conversation = createTestConversation("test-1", 25);
      const existingSummary = createTestSummary("test-1", 10);

      const result = needsSummary(conversation, existingSummary);
      expect(result).toBe(true);
    });

    it("should return false when conversation hasn't grown enough since last summary", () => {
      const conversation = createTestConversation("test-1", 15);
      const existingSummary = createTestSummary("test-1", 10);

      const result = needsSummary(conversation, existingSummary);
      expect(result).toBe(false);
    });

    it("should use SUMMARY_CONFIG.MESSAGES_THRESHOLD correctly", () => {
      // Test exactly at threshold
      const conversationAtThreshold = createTestConversation(
        "test-1",
        SUMMARY_CONFIG.MESSAGES_THRESHOLD,
      );
      expect(needsSummary(conversationAtThreshold)).toBe(true);

      // Test just below threshold
      const conversationBelowThreshold = createTestConversation(
        "test-1",
        SUMMARY_CONFIG.MESSAGES_THRESHOLD - 1,
      );
      expect(needsSummary(conversationBelowThreshold)).toBe(false);
    });
  });

  describe("createConversationSummary", () => {
    it("should create a new summary without existing summary", () => {
      const summary = createConversationSummary(
        "conv-1",
        "Test summary text",
        10,
      );

      expect(summary).toMatchObject({
        conversationId: "conv-1",
        summary: "Test summary text",
        messageCount: 10,
        version: 1,
      });
      expect(summary.id).toMatch(/^summary_conv-1_\d+$/);
      expect(summary.lastUpdated).toBeTypeOf("number");
    });

    it("should increment version when creating with existing summary", () => {
      const existingSummary = createTestSummary("conv-1", 5, 2);
      const summary = createConversationSummary(
        "conv-1",
        "Updated summary text",
        15,
        existingSummary,
      );

      expect(summary.version).toBe(3);
      expect(summary.messageCount).toBe(15);
      expect(summary.summary).toBe("Updated summary text");
    });
  });

  describe("generateConversationSummary", () => {
    it("should generate summary for conversation without existing summary", async () => {
      const { generateContent } = await import("../../services/geminiService");
      const mockGenerateContent = generateContent as any;
      mockGenerateContent.mockResolvedValue("Generated summary text");

      const conversation = createTestConversation("test-1", 15);
      const result = await generateConversationSummary(conversation);

      expect(result).toBe("Generated summary text");
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining("Crea un resumen conciso"),
        "gemini-1.5-flash",
      );
    });

    it("should generate summary for conversation with existing summary", async () => {
      const { generateContent } = await import("../../services/geminiService");
      const mockGenerateContent = generateContent as any;
      mockGenerateContent.mockResolvedValue("Updated summary text");

      const conversation = createTestConversation("test-1", 25);
      const existingSummary = createTestSummary("test-1", 10);

      const result = await generateConversationSummary(
        conversation,
        existingSummary,
      );

      expect(result).toBe("Updated summary text");
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.stringContaining("Resumen previo de la conversación"),
        "gemini-1.5-flash",
      );
    });

    it("should truncate summary if it exceeds max length", async () => {
      const { generateContent } = await import("../../services/geminiService");
      const mockGenerateContent = generateContent as any;
      const longSummary = "A".repeat(SUMMARY_CONFIG.MAX_SUMMARY_LENGTH + 100);
      mockGenerateContent.mockResolvedValue(longSummary);

      const conversation = createTestConversation("test-1", 15);
      const result = await generateConversationSummary(conversation);

      expect(result).toHaveLength(SUMMARY_CONFIG.MAX_SUMMARY_LENGTH + 3); // +3 for "..."
      expect(result.endsWith("...")).toBe(true);
    });

    it("should handle errors and throw meaningful error message", async () => {
      const { generateContent } = await import("../../services/geminiService");
      const mockGenerateContent = generateContent as any;
      mockGenerateContent.mockRejectedValue(new Error("API Error"));

      const conversation = createTestConversation("test-1", 15);

      await expect(generateConversationSummary(conversation)).rejects.toThrow(
        "No se pudo generar el resumen: API Error",
      );
    });
  });

  describe("getEnrichedContext", () => {
    it("should return original messages when no summary exists", () => {
      const conversation = createTestConversation("test-1", 8);
      const result = getEnrichedContext(conversation);

      expect(result).toEqual(conversation.messages);
    });

    it("should return original messages when conversation is short", () => {
      const conversation = createTestConversation("test-1", 3);
      const summary = createTestSummary("test-1", 10);
      const result = getEnrichedContext(conversation, summary);

      expect(result).toEqual(conversation.messages);
    });

    it("should return summary plus recent messages when conversation is long", () => {
      const conversation = createTestConversation("test-1", 15);
      const summary = createTestSummary("test-1", 10);
      const result = getEnrichedContext(conversation, summary);

      expect(result).toHaveLength(SUMMARY_CONFIG.RECENT_MESSAGES_COUNT + 1); // +1 for summary
      expect(result[0].text).toContain("[CONTEXTO PREVIO]");
      expect(result[0].sender).toBe(Sender.AI);

      // Los últimos mensajes deben ser los mensajes recientes originales
      const recentMessages = result.slice(1);
      const expectedRecentMessages = conversation.messages.slice(
        -SUMMARY_CONFIG.RECENT_MESSAGES_COUNT,
      );
      expect(recentMessages).toEqual(expectedRecentMessages);
    });
  });

  describe("getEnrichedSystemInstruction", () => {
    it("should return original instruction when no summary exists", () => {
      const originalInstruction = "You are a helpful assistant.";
      const result = getEnrichedSystemInstruction(originalInstruction);

      expect(result).toBe(originalInstruction);
    });

    it("should append context when summary exists", () => {
      const originalInstruction = "You are a helpful assistant.";
      const summary = createTestSummary("test-1", 10);
      const result = getEnrichedSystemInstruction(originalInstruction, summary);

      expect(result).toContain(originalInstruction);
      expect(result).toContain("CONTEXTO DE LA CONVERSACIÓN PREVIA");
      expect(result).toContain(summary.summary);
      expect(result).toContain("mantener coherencia y continuidad");
    });
  });

  describe("shouldCleanupSummary", () => {
    it("should return true for old summaries", () => {
      const oneWeekAgo = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 días
      const oldSummary = {
        ...createTestSummary("test-1", 10),
        lastUpdated: oneWeekAgo,
      };

      const result = shouldCleanupSummary(oldSummary);
      expect(result).toBe(true);
    });

    it("should return false for recent summaries", () => {
      const yesterday = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 día
      const recentSummary = {
        ...createTestSummary("test-1", 10),
        lastUpdated: yesterday,
      };

      const result = shouldCleanupSummary(recentSummary);
      expect(result).toBe(false);
    });
  });

  describe("extractTopics", () => {
    it("should extract topics from summary text", () => {
      const summaryText =
        "Esta conversación discute programación en JavaScript, algoritmos de búsqueda, estructuras de datos como arrays y objetos, y optimización de rendimiento.";

      const topics = extractTopics(summaryText);

      expect(topics).toBeInstanceOf(Array);
      expect(topics.length).toBeLessThanOrEqual(5);
      expect(topics).toContain("programación");
      expect(topics).toContain("javascript");
      expect(topics).toContain("algoritmos");
    });

    it("should filter out common words", () => {
      const summaryText =
        "Esta es una conversación sobre programación donde se discute como hacer para optimizar el código";

      const topics = extractTopics(summaryText);

      // Palabras comunes no deberían aparecer
      expect(topics).not.toContain("esta");
      expect(topics).not.toContain("para");
      expect(topics).not.toContain("donde");
      expect(topics).not.toContain("como");
    });

    it("should return empty array for empty or short text", () => {
      expect(extractTopics("")).toEqual([]);
      expect(extractTopics("hola")).toEqual([]);
    });

    it("should limit results to maximum 5 topics", () => {
      const longText =
        "programación javascript typescript react angular vue nodejs express mongodb postgresql redis docker kubernetes github gitlab bitbucket".repeat(
          5,
        );

      const topics = extractTopics(longText);
      expect(topics.length).toBeLessThanOrEqual(5);
    });

    it("should return most frequent words first", () => {
      const summaryText =
        "javascript javascript javascript react react angular";

      const topics = extractTopics(summaryText);

      expect(topics[0]).toBe("javascript");
      expect(topics[1]).toBe("react");
    });
  });
});
