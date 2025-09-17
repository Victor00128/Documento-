import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useChatStore } from "../../store/chatStore";
import { Sender, ChatMessage, AIPersonality } from "../../types";

// Mock de los servicios para evitar llamadas reales a APIs
vi.mock("../../services/geminiService", () => ({
  startChat: vi.fn(),
  generateContent: vi.fn().mockResolvedValue("Test summary"),
  internetSearchTool: {},
  realTimeClockTool: {},
}));

vi.mock("../../services/openaiService", () => ({
  getOpenAIStream: vi.fn(),
}));

vi.mock("../../services/summaryService", () => ({
  needsSummary: vi.fn().mockReturnValue(false),
  generateConversationSummary: vi.fn().mockResolvedValue("Test summary"),
  createConversationSummary: vi.fn().mockReturnValue({
    id: "test-summary",
    conversationId: "test-conv",
    summary: "Test summary",
    messageCount: 5,
    lastUpdated: Date.now(),
    version: 1,
  }),
  getEnrichedSystemInstruction: vi.fn((instruction) => instruction),
  getEnrichedContext: vi.fn((conversation) => conversation.messages),
}));

vi.mock("../../services/searchService", () => ({
  performSearch: vi.fn().mockResolvedValue([]),
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

const initialState = useChatStore.getState();

describe("ChatStore", () => {
  beforeEach(() => {
    // Limpiar el store antes de cada prueba
    useChatStore.setState(initialState, true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Conversation Management", () => {
    it("should create a new conversation with default personality", () => {
      const store = useChatStore.getState();
      store.newConversation();

      const conversations = Object.values(store.conversations);
      expect(conversations).toHaveLength(1);

      const conversation = conversations[0];
      expect(conversation.personality).toBe("flash");
      expect(conversation.title).toBe("Nueva Conversación");
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].sender).toBe(Sender.AI);
      expect(store.activeConversationId).toBe(conversation.id);
    });

    it("should create a new conversation with specific personality", () => {
      const store = useChatStore.getState();
      store.newConversation("developer");

      const conversations = Object.values(store.conversations);
      const conversation = conversations[0];
      expect(conversation.personality).toBe("developer");
    });

    it("should add a conversation to the store", () => {
      const store = useChatStore.getState();
      const testConversation = {
        id: "test-id",
        title: "Test Conversation",
        messages: [createTestMessage("msg-1", Sender.User, "Hello")],
        lastModified: Date.now(),
        personality: "flash" as AIPersonality,
      };

      store.addConversation(testConversation);

      expect(store.conversations["test-id"]).toEqual(testConversation);
    });

    it("should update a conversation", () => {
      const store = useChatStore.getState();
      const testConversation = {
        id: "test-id",
        title: "Original Title",
        messages: [],
        lastModified: Date.now(),
        personality: "flash" as AIPersonality,
      };

      store.addConversation(testConversation);
      store.updateConversation("test-id", { title: "Updated Title" });

      expect(store.conversations["test-id"].title).toBe("Updated Title");
      expect(store.conversations["test-id"].lastModified).toBeGreaterThan(
        testConversation.lastModified,
      );
    });

    it("should delete a conversation when there are multiple conversations", () => {
      const store = useChatStore.getState();

      // Crear múltiples conversaciones
      store.newConversation();
      const firstId = store.activeConversationId!;
      store.newConversation();
      const secondId = store.activeConversationId!;

      expect(Object.keys(store.conversations)).toHaveLength(2);

      // Eliminar la primera conversación
      store.deleteConversation(firstId);

      expect(Object.keys(store.conversations)).toHaveLength(1);
      expect(store.conversations[firstId]).toBeUndefined();
      expect(store.activeConversationId).toBe(secondId);
    });

    it("should not delete conversation if it's the only one", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const conversationId = store.activeConversationId!;

      store.deleteConversation(conversationId);

      // La conversación no debería eliminarse
      expect(Object.keys(store.conversations)).toHaveLength(1);
      expect(store.conversations[conversationId]).toBeDefined();
    });

    it("should select a conversation", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const firstId = store.activeConversationId!;
      store.newConversation();
      const secondId = store.activeConversationId!;

      store.selectConversation(firstId);

      expect(store.activeConversationId).toBe(firstId);
      expect(store.isSidebarOpen).toBe(false);
    });
  });

  describe("Message Management", () => {
    it("should add a message to a conversation", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const conversationId = store.activeConversationId!;
      const testMessage = createTestMessage(
        "msg-1",
        Sender.User,
        "Test message",
      );

      store.addMessage(conversationId, testMessage);

      const conversation = store.conversations[conversationId];
      expect(conversation.messages).toHaveLength(2); // Welcome message + new message
      expect(conversation.messages[1]).toEqual(testMessage);
    });

    it("should update a message", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const conversationId = store.activeConversationId!;
      const testMessage = createTestMessage(
        "msg-1",
        Sender.User,
        "Original text",
      );

      store.addMessage(conversationId, testMessage);
      store.updateMessage(conversationId, "msg-1", { text: "Updated text" });

      const conversation = store.conversations[conversationId];
      const updatedMessage = conversation.messages.find(
        (m) => m.id === "msg-1",
      );
      expect(updatedMessage?.text).toBe("Updated text");
    });

    it("should delete a message", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const conversationId = store.activeConversationId!;
      const testMessage = createTestMessage(
        "msg-1",
        Sender.User,
        "Test message",
      );

      store.addMessage(conversationId, testMessage);
      expect(store.conversations[conversationId].messages).toHaveLength(2);

      store.deleteMessage(conversationId, "msg-1");
      expect(store.conversations[conversationId].messages).toHaveLength(1);

      const remainingMessage = store.conversations[
        conversationId
      ].messages.find((m) => m.id === "msg-1");
      expect(remainingMessage).toBeUndefined();
    });
  });

  describe("Message Editing", () => {
    it("should start editing a message", () => {
      const store = useChatStore.getState();
      store.startEditingMessage("msg-1", "Original text");

      expect(store.editingMessageId).toBe("msg-1");
      expect(store.editingText).toBe("Original text");
    });

    it("should stop editing a message", () => {
      const store = useChatStore.getState();
      store.startEditingMessage("msg-1", "Original text");
      store.stopEditingMessage();

      expect(store.editingMessageId).toBe(null);
      expect(store.editingText).toBe("");
    });

    it("should update editing text", () => {
      const store = useChatStore.getState();
      store.startEditingMessage("msg-1", "Original text");
      store.updateEditingText("New text");

      expect(store.editingText).toBe("New text");
    });
  });

  describe("Personality Management", () => {
    it("should change personality of active conversation", () => {
      const store = useChatStore.getState();
      store.newConversation("flash");
      const conversationId = store.activeConversationId!;

      store.changePersonality("developer");

      expect(store.conversations[conversationId].personality).toBe("developer");
    });

    it("should create new conversation if no active conversation exists", () => {
      const store = useChatStore.getState();
      store.activeConversationId = null;

      store.changePersonality("developer");

      expect(store.activeConversationId).not.toBe(null);
      const conversation = store.conversations[store.activeConversationId!];
      expect(conversation.personality).toBe("developer");
    });
  });

  describe("UI State Management", () => {
    it("should toggle sidebar", () => {
      const store = useChatStore.getState();
      expect(store.isSidebarOpen).toBe(false);

      store.toggleSidebar();
      expect(store.isSidebarOpen).toBe(true);

      store.toggleSidebar();
      expect(store.isSidebarOpen).toBe(false);
    });

    it("should set loading state", () => {
      const store = useChatStore.getState();
      store.setLoading(true);
      expect(store.isLoading).toBe(true);

      store.setLoading(false);
      expect(store.isLoading).toBe(false);
    });

    it("should set error state", () => {
      const store = useChatStore.getState();
      store.setError("Test error");
      expect(store.error).toBe("Test error");

      store.setError(null);
      expect(store.error).toBe(null);
    });

    it("should show and hide toast notifications", () => {
      const store = useChatStore.getState();
      store.showToast("Test message", "success");

      expect(store.toast).toEqual({
        message: "Test message",
        type: "success",
      });

      store.hideToast();
      expect(store.toast).toBe(null);
    });
  });

  describe("Fullscreen Management", () => {
    it("should set fullscreen state", () => {
      const store = useChatStore.getState();
      store.setFullscreen(true);
      expect(store.isFullscreen).toBe(true);

      store.setFullscreen(false);
      expect(store.isFullscreen).toBe(false);
    });

    it("should toggle fullscreen", async () => {
      const store = useChatStore.getState();

      // Mock fullscreen API
      document.fullscreenElement = null;

      await store.toggleFullscreen();
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    });
  });

  describe("Search Management", () => {
    it("should toggle search", () => {
      const store = useChatStore.getState();
      const initialState = store.isSearchEnabled;

      store.toggleSearch();
      expect(store.isSearchEnabled).toBe(!initialState);
    });

    it("should set searching state", () => {
      const store = useChatStore.getState();
      store.setSearching(true);
      expect(store.isSearching).toBe(true);

      store.setSearching(false);
      expect(store.isSearching).toBe(false);
    });

    it("should set current tool", () => {
      const store = useChatStore.getState();
      store.setCurrentTool("internetSearch", "test query");

      expect(store.currentTool).toBe("internetSearch");
      expect(store.toolQuery).toBe("test query");

      store.setCurrentTool(null);
      expect(store.currentTool).toBe(null);
      expect(store.toolQuery).toBe(null);
    });
  });

  describe("Summary Management", () => {
    it("should get summary for conversation", () => {
      const store = useChatStore.getState();
      const testSummary = {
        id: "summary-1",
        conversationId: "conv-1",
        summary: "Test summary",
        messageCount: 5,
        lastUpdated: Date.now(),
        version: 1,
      };

      store.summaries = { "conv-1": testSummary };

      const result = store.getSummaryForConversation("conv-1");
      expect(result).toEqual(testSummary);
    });

    it("should return undefined for non-existent summary", () => {
      const store = useChatStore.getState();
      const result = store.getSummaryForConversation("non-existent");
      expect(result).toBeUndefined();
    });

    it("should get enriched context for conversation", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const conversationId = store.activeConversationId!;

      const result = store.getEnrichedContextForConversation(conversationId);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Conversation Download", () => {
    it("should download conversation as text file", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const conversationId = store.activeConversationId!;

      // Mock DOM elements for file download
      const mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
      };
      const createElementSpy = vi
        .spyOn(document, "createElement")
        .mockReturnValue(mockLink as any);
      const appendChildSpy = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation(() => mockLink as any);
      const removeChildSpy = vi
        .spyOn(document.body, "removeChild")
        .mockImplementation(vi.fn());

      store.downloadConversation(conversationId);

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe("Conversation Rename", () => {
    it("should rename conversation with valid title", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const conversationId = store.activeConversationId!;

      store.renameConversation(conversationId, "New Title");

      expect(store.conversations[conversationId].title).toBe("New Title");
    });

    it("should not rename conversation with empty title", () => {
      const store = useChatStore.getState();
      store.newConversation();
      const conversationId = store.activeConversationId!;
      const originalTitle = store.conversations[conversationId].title;

      store.renameConversation(conversationId, "");
      store.renameConversation(conversationId, "   ");

      expect(store.conversations[conversationId].title).toBe(originalTitle);
    });
  });

  describe("sendMessage and Generation Control", () => {
    it("should set an abortController when sendMessage is called", async () => {
      const store = useChatStore.getState();
      store.newConversation();

      // Mockear la llamada a la API para que no se complete inmediatamente
      const { getOpenAIStream } = await import("../../services/openaiService");
      (getOpenAIStream as any).mockImplementation(async function* () {
        await new Promise((resolve) => setTimeout(resolve, 200)); // Simular espera
        yield { type: "text", value: "Hello" };
      });

      store.sendMessage("Test");

      expect(store.abortController).toBeInstanceOf(AbortController);
    });

    it("should abort generation when stopGeneration is called", async () => {
      const store = useChatStore.getState();
      store.newConversation();

      const abortSpy = vi.spyOn(AbortController.prototype, "abort");

      // Iniciar un mensaje
      store.sendMessage("Test");

      // Verificar que el controlador existe
      expect(store.abortController).not.toBeNull();

      // Detener la generación
      store.stopGeneration();

      // Verificar que se llamó a abort()
      expect(abortSpy).toHaveBeenCalledWith("User requested stop");
      expect(store.isLoading).toBe(false);
      expect(store.isSearching).toBe(false);
      expect(store.abortController).toBeNull();

      abortSpy.mockRestore();
    });

    it("should handle tool calls correctly for Gemini", async () => {
      const { startChat } = await import("../../services/geminiService");
      const { performSearch } = await import("../../services/searchService");

      // Mock de la respuesta del stream de Gemini con una tool call
      const mockStream = (async function* () {
        yield {
          functionCalls: () => [
            { name: "internetSearch", args: { query: "test" } },
          ],
          text: () => "",
        };
      })();

      const mockChatSession = {
        sendMessageStream: vi.fn().mockResolvedValue({ stream: mockStream }),
      };
      (startChat as any).mockReturnValue(mockChatSession);
      (performSearch as any).mockResolvedValue([
        { title: "Result", snippet: "Snippet", link: "link" },
      ]);

      const store = useChatStore.getState();
      store.newConversation("flash"); // Usar una personalidad de Gemini

      await store.sendMessage("Search for test");

      // Verificar que el estado de búsqueda se activó
      expect(store.isSearching).toBe(true);
      expect(store.currentTool).toBe("internetSearch");
      expect(store.toolQuery).toBe("test");

      // Verificar que se llamó a performSearch
      expect(performSearch).toHaveBeenCalledWith(
        "test",
        expect.any(AbortSignal),
      );
    });
  });
});
