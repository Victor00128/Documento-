import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Sender,
  ChatMessage,
  AIPersonality,
  PERSONALITIES,
  Conversation,
  ConversationSummary,
} from "../types";
import {
  needsSummary,
  generateConversationSummary,
  createConversationSummary,
  getEnrichedSystemInstruction,
  getEnrichedContext,
} from "../services/summaryService";
import { supabase, getRecentHistory } from "../services/supabaseClient";
import { ChatValidator, debugChat } from "../services/debugService";

interface ChatState {
  conversations: Record<string, Conversation>;
  summaries: Record<string, ConversationSummary>;
  activeConversationId: string | null;
  isLoading: boolean;
  chat: any; // gemini session
  error: string | null;
  isFullscreen: boolean;
  isSidebarOpen: boolean;
  isSearchEnabled: boolean;
  isSearching: boolean;
  editingMessageId: string | null;
  editingText: string;
  currentTool: string | null;
  toolQuery: string | null;
  toast: { message: string; type: "success" | "error" | "info" } | null;
  isGeneratingSummary: boolean;
  usingPreviousImage: boolean;
  abortController: AbortController | null;
  isDragging: boolean;
  fileForUpload: File | null;

  // actions
  setActiveConversationId: (id: string | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchEnabled: (enabled: boolean) => void;
  setSearching: (searching: boolean) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  hideToast: () => void;
  setUsingPreviousImage: (using: boolean) => void;
  stopGeneration: () => void;
  setIsDragging: (isDragging: boolean) => void;
  setFileForUpload: (file: File | null) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, newTitle: string) => void;
  downloadConversation: (id: string) => void;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updates: Partial<ChatMessage>,
  ) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  startEditingMessage: (messageId: string, text: string) => void;
  stopEditingMessage: () => void;
  updateEditingText: (text: string) => void;
  regenerateLastResponse: () => Promise<void>;
  editAndResendMessage: (messageId: string, newText: string) => Promise<void>;
  setCurrentTool: (tool: string | null, query?: string) => void;
  newConversation: (personality?: AIPersonality) => void;
  sendMessage: (text: string, file?: File) => Promise<void>;
  changePersonality: (newPersonality: AIPersonality) => void;
  selectConversation: (id: string) => void;
  toggleSidebar: () => void;
  toggleFullscreen: () => void;
  toggleSearch: () => void;
  generateSummaryForConversation: (conversationId: string) => Promise<void>;
  getSummaryForConversation: (
    conversationId: string,
  ) => ConversationSummary | undefined;
  saveToSupabase: (
    conversationId: string,
    userPrompt: string,
    aiResponse: string,
    metadata?: any,
  ) => Promise<void>;
  getRecentHistory: (conversationId: string, limit?: number) => Promise<any[]>;
  getEnrichedContextForConversation: (conversationId: string) => ChatMessage[];
  getLastImageFromConversation: (conversationId: string) => ChatMessage | null;
  backgroundSummaryGeneration: (conversationId: string) => void;
}

// --- NUEVA FUNCIÓN: Convierte un string base64 a un objeto File ---
const base64ToFile = (
  base64: string,
  filename: string,
  mimeType: string,
): File => {
  const arr = base64.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || mimeType;
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: {},
      summaries: {},
      activeConversationId: null,
      isLoading: false,
      chat: null,
      error: null,
      isFullscreen: false,
      isSidebarOpen: false,
      isSearchEnabled: true,
      isSearching: false,
      editingMessageId: null,
      editingText: "",
      currentTool: null,
      toolQuery: null,
      toast: null,
      isGeneratingSummary: false,
      usingPreviousImage: false,
      abortController: null,
      isDragging: false,
      fileForUpload: null,

      setActiveConversationId: (id) => set({ activeConversationId: id }),
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
      setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setSearchEnabled: (enabled) => set({ isSearchEnabled: enabled }),
      setSearching: (searching) => set({ isSearching: searching }),
      showToast: (message, type = "info") => set({ toast: { message, type } }),
      hideToast: () => set({ toast: null }),
      setUsingPreviousImage: (using: boolean) =>
        set({ usingPreviousImage: using }),
      stopGeneration: () => {
        const { abortController } = get();
        if (abortController) {
          debugChat.log("Aborting generation...");
          abortController.abort("User requested stop");
          set({
            abortController: null,
            isLoading: false,
            isSearching: false,
            currentTool: null,
            toolQuery: null,
          });
        }
      },
      setIsDragging: (isDragging: boolean) => set({ isDragging }),
      setFileForUpload: (file: File | null) => set({ fileForUpload: file }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversation.id]: conversation,
          },
        })),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [id]: {
              ...state.conversations[id],
              ...updates,
              lastModified: Date.now(),
            },
          },
        })),

      deleteConversation: (id) => {
        const state = get();
        if (Object.keys(state.conversations).length <= 1) return;

        const newConversations = { ...state.conversations };
        delete newConversations[id];

        let newActiveId = state.activeConversationId;
        if (state.activeConversationId === id) {
          const remainingConvos = Object.values(newConversations).sort(
            (a, b) => b.lastModified - a.lastModified,
          );
          newActiveId =
            remainingConvos.length > 0 ? remainingConvos[0].id : null;
        }

        set({
          conversations: newConversations,
          activeConversationId: newActiveId,
        });
      },

      renameConversation: (id, newTitle) => {
        if (!newTitle.trim()) return;
        get().updateConversation(id, { title: newTitle.trim() });
      },

      downloadConversation: (id) => {
        const state = get();
        const conversation = state.conversations[id];
        if (!conversation) return;

        const fileContent =
          `Conversación: ${conversation.title}\n` +
          `Personalidad IA: ${PERSONALITIES[conversation.personality].name}\n` +
          `Fecha: ${new Date(conversation.lastModified).toLocaleString()}\n\n` +
          "---\n\n" +
          conversation.messages
            .filter((m) => m.id !== "initial-message")
            .map((msg) => {
              const sender = msg.sender === Sender.User ? "Tú" : "Bot";
              const fileInfo = msg.fileInfo
                ? `[Archivo Adjunto: ${msg.fileInfo.name}]`
                : "";
              return `${sender}:\n${fileInfo ? fileInfo + "\n" : ""}${msg.text}\n`;
            })
            .join("\n---\n\n");

        const blob = new Blob([fileContent], {
          type: "text/plain;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const sanitizedTitle = conversation.title
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase();
        link.download = `conversacion_${sanitizedTitle || "chat"}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },

      addMessage: (conversationId, message) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...state.conversations[conversationId],
              messages: [
                ...state.conversations[conversationId].messages,
                message,
              ],
              lastModified: Date.now(),
            },
          },
        })),

      updateMessage: (conversationId, messageId, updates) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...state.conversations[conversationId],
              messages: state.conversations[conversationId].messages.map(
                (msg) => (msg.id === messageId ? { ...msg, ...updates } : msg),
              ),
              lastModified: Date.now(),
            },
          },
        })),

      deleteMessage: (conversationId, messageId) =>
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...state.conversations[conversationId],
              messages: state.conversations[conversationId].messages.filter(
                (msg) => msg.id !== messageId,
              ),
              lastModified: Date.now(),
            },
          },
        })),

      startEditingMessage: (messageId, text) =>
        set({ editingMessageId: messageId, editingText: text }),

      stopEditingMessage: () =>
        set({ editingMessageId: null, editingText: "" }),

      updateEditingText: (text) => set({ editingText: text }),

      regenerateLastResponse: async () => {
        const state = get();
        if (!state.activeConversationId) return;

        const conversation = state.conversations[state.activeConversationId];
        if (!conversation) return;

        const userMessages = conversation.messages.filter(
          (m) => m.sender === Sender.User,
        );
        const lastUserMessage = userMessages[userMessages.length - 1];

        if (!lastUserMessage) return;

        const messagesWithoutLastAI = conversation.messages.filter(
          (msg, index) => {
            if (
              msg.sender === Sender.AI &&
              index >
                conversation.messages.findIndex(
                  (m) => m.id === lastUserMessage.id,
                )
            ) {
              return false;
            }
            return true;
          },
        );

        get().updateConversation(state.activeConversationId, {
          messages: messagesWithoutLastAI,
        });

        let fileToResend: File | undefined;
        try {
          fileToResend = lastUserMessage.fileBase64
            ? base64ToFile(
                lastUserMessage.fileBase64,
                lastUserMessage.fileInfo?.name || "file",
                lastUserMessage.fileInfo?.type || "application/octet-stream",
              )
            : undefined;
        } catch (error) {
          console.error("Error al reconstruir el archivo desde base64:", error);
          get().showToast("Error al procesar el archivo adjunto.", "error");
          return; // Detener si el archivo está corrupto
        }
        await get().sendMessage(lastUserMessage.text, fileToResend);
      },

      // edit and resend messages
      editAndResendMessage: async (messageId: string, newText: string) => {
        const state = get();
        if (!state.activeConversationId) return;

        const conversation = state.conversations[state.activeConversationId];
        if (!conversation) return;

        // find message to edit
        const messageToEdit = conversation.messages.find(
          (m) => m.id === messageId,
        );
        if (!messageToEdit || messageToEdit.sender !== Sender.User) return;

        // get message index
        const messageIndex = conversation.messages.findIndex(
          (m) => m.id === messageId,
        );

        // remove messages after this one
        const messagesBeforeEdit = conversation.messages.slice(
          0,
          messageIndex + 1,
        );

        // update message text
        const updatedMessage = { ...messageToEdit, text: newText };
        messagesBeforeEdit[messageIndex] = updatedMessage;

        // update conversation
        get().updateConversation(state.activeConversationId, {
          messages: messagesBeforeEdit,
        });

        // stop editing
        get().stopEditingMessage();

        // resend message
        let fileToResend: File | undefined;
        try {
          fileToResend = messageToEdit.fileBase64
            ? base64ToFile(
                messageToEdit.fileBase64,
                messageToEdit.fileInfo?.name || "file",
                messageToEdit.fileInfo?.type || "application/octet-stream",
              )
            : undefined;
        } catch (error) {
          console.error("Error al reconstruir el archivo desde base64:", error);
          get().showToast("Error al procesar el archivo adjunto.", "error");
          return; // Detener si el archivo está corrupto
        }
        await get().sendMessage(newText, fileToResend);
      },

      setCurrentTool: (tool, query) =>
        set({ currentTool: tool, toolQuery: query || null }),

      newConversation: (personality = "flash") => {
        const config = PERSONALITIES[personality];
        const newId = Date.now().toString();
        const welcomeMessage: ChatMessage = {
          id: "initial-message",
          sender: Sender.AI,
          text: config.welcomeMessage,
        };

        const newConversation: Conversation = {
          id: newId,
          title: "Nueva Conversación",
          messages: [welcomeMessage],
          lastModified: Date.now(),
          personality,
        };

        get().addConversation(newConversation);
        get().setActiveConversationId(newId);
        get().setError(null);
        get().showToast("Nueva conversación iniciada", "success");
      },

      sendMessage: async (text, file) => {
        const state = get();
        if ((!text && !file) || !state.activeConversationId) return;

        // Abortar cualquier generación anterior
        if (state.abortController) {
          state.abortController.abort("New message started");
        }

        const abortController = new AbortController();
        set({ abortController });

        debugChat.log("Starting sendMessage", {
          text: text?.substring(0, 50),
          hasFile: !!file,
        });

        // --- Start Laugh Handling (no cancellation needed) ---
        const laughExpressions = [
          /^j(a|i)+j(a|i)+j(a|i)*$/i,
          /^j+$/i,
          /^x[d]+$/i,
          /^lo+l$/i,
          /😂/,
          /🤣/,
        ];
        if (
          laughExpressions.some((regex) => regex.test(text.trim())) &&
          !file
        ) {
          const userMessage: ChatMessage = {
            id: Date.now().toString(),
            sender: Sender.User,
            text,
          };
          const lastAiMessage =
            state.conversations[state.activeConversationId]?.messages
              .filter((m) => m.sender === Sender.AI)
              .pop()
              ?.text.toLowerCase() || "";
          const wasJoke = lastAiMessage.includes("chiste");
          const baseResponses = [
            "¡Me alegro de que te haya gustado! 😄",
            "¡Genial, sabía que te haría reír!",
            "¡Perfecto! ¿En qué más puedo ayudarte?",
          ];
          const jokeFollowUpResponse =
            "¡Qué bueno que te gustó! ¿Te cuento otro?";
          let aiResponseText =
            wasJoke && Math.random() > 0.5
              ? jokeFollowUpResponse
              : baseResponses[Math.floor(Math.random() * baseResponses.length)];
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: Sender.AI,
            text: aiResponseText,
          };
          get().addMessage(state.activeConversationId, userMessage);
          get().addMessage(state.activeConversationId, aiMessage);
          set({ abortController: null });
          return;
        }
        // --- End Laugh Handling ---

        // --- MODIFICADO: Convertimos el File a base64 antes de guardarlo en el estado ---
        let fileBase64: string | undefined;
        if (file) {
          try {
            // Validación de tamaño (20MB)
            if (file.size > 20 * 1024 * 1024) {
              throw new Error("El archivo es demasiado grande (máximo 20MB)");
            }
            fileBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () =>
                reject(new Error("Error al leer el archivo"));
            });
          } catch (error) {
            console.error("Error procesando archivo:", error);
            get().setError(`Error: ${(error as Error).message}`);
            return;
          }
        }

        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          sender: Sender.User,
          text,
          fileInfo: file
            ? { name: file.name, type: file.type, size: file.size }
            : undefined,
          // --- NO guardamos fileData, guardamos fileBase64 ---
          fileBase64,
        };
        const aiMessageId = (Date.now() + 1).toString();

        const TIMEOUT_MS = 60000;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        get().setLoading(true);
        get().setError(null);

        if (state.activeConversationId) {
          const conversation = state.conversations[state.activeConversationId];
          if (
            !conversation.messages.some((m) => m.sender === Sender.User) &&
            text
          ) {
            get().updateConversation(state.activeConversationId, {
              title: text.substring(0, 40),
            });
          }
          get().addMessage(state.activeConversationId, userMessage);
          get().addMessage(state.activeConversationId, {
            id: aiMessageId,
            sender: Sender.AI,
            text: "...",
          });

          timeoutId = setTimeout(() => {
            const currentState = get();
            if (currentState.isLoading && currentState.abortController) {
              console.error(
                "Timeout de la operación: la respuesta tardó demasiado.",
              );
              currentState.abortController.abort("Timeout");
            }
          }, TIMEOUT_MS);
        }

        try {
          const conversation = get().conversations[state.activeConversationId!];
          const config = PERSONALITIES[conversation.personality];
          let enrichedContext = get().getEnrichedContextForConversation(
            state.activeConversationId!,
          );
          const summary = get().getSummaryForConversation(
            state.activeConversationId!,
          );
          const enrichedSystemInstruction = getEnrichedSystemInstruction(
            config.systemInstruction,
            summary,
          );

          // --- NUEVO: Validar y limpiar el historial ANTES de enviarlo a cualquier API ---
          enrichedContext = ChatValidator.cleanHistoryForAPI(enrichedContext);
          // --- FIN DEL NUEVO CÓDIGO ---

          if (config.provider === "openai") {
            const { getOpenAIStream } = await import(
              "../services/openaiService"
            );
            const { performSearch } = await import("../services/searchService");

            const stream = getOpenAIStream(
              config,
              enrichedContext.slice(0, -2),
              userMessage,
              undefined,
              undefined,
              abortController.signal, // Pasar la señal correctamente
            );

            let aiResponseText = "";
            try {
              for await (const chunk of stream) {
                // Verificar si fue abortado
                if (abortController.signal.aborted) {
                  debugChat.log("OpenAI stream aborted");
                  break;
                }

                if (chunk.type === "text") {
                  aiResponseText += chunk.value;
                  get().updateMessage(
                    state.activeConversationId!,
                    aiMessageId,
                    {
                      text: aiResponseText,
                    },
                  );
                } else if (chunk.type === "tool_call") {
                  // Manejar tool calls con abort signal
                  get().setSearching(true);
                  const toolCall = chunk.value[0];
                  get().setCurrentTool(
                    toolCall.function.name,
                    JSON.parse(toolCall.function.arguments).query,
                  );

                  try {
                    if (toolCall.function.name === "internetSearch") {
                      const args = JSON.parse(toolCall.function.arguments);
                      const searchResults = await performSearch(
                        args.query,
                        abortController.signal,
                      );
                      const formattedResults = searchResults
                        .slice(0, 5)
                        .map(
                          (r, i) =>
                            `${i + 1}. ${r.title}\n${r.snippet}\n${r.link}`,
                        )
                        .join("\n\n");

                      // Continuar con el resultado de la herramienta
                      const toolResultStream = getOpenAIStream(
                        config,
                        enrichedContext.slice(0, -2),
                        userMessage,
                        undefined,
                        [
                          {
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content:
                              formattedResults ||
                              "No se encontraron resultados.",
                          },
                        ],
                        abortController.signal,
                      );

                      for await (const toolChunk of toolResultStream) {
                        if (abortController.signal.aborted) break;

                        if (toolChunk.type === "text") {
                          aiResponseText += toolChunk.value;
                          get().updateMessage(
                            state.activeConversationId!,
                            aiMessageId,
                            {
                              text: aiResponseText,
                            },
                          );
                        }
                      }
                    }
                  } catch (toolError) {
                    if (abortController.signal.aborted) {
                      debugChat.log("Tool execution aborted");
                      break;
                    }
                    console.error("Error en tool call:", toolError);
                  }
                }
              }
            } catch (streamError) {
              if (abortController.signal.aborted) {
                debugChat.log("OpenAI stream was aborted");
              } else {
                throw streamError;
              }
            }
          } else {
            // Gemini Logic
            let fileToProcess = file;
            const imageKeywords = [
              "imagen",
              "foto",
              "ejercicio",
              "mismo",
              "anterior",
              "arriba",
            ];
            if (
              !file &&
              imageKeywords.some((word) => text.toLowerCase().includes(word))
            ) {
              const lastImage = get().getLastImageFromConversation(
                state.activeConversationId!,
              );
              if (lastImage?.fileBase64) {
                get().setUsingPreviousImage(true);
                // --- MODIFICADO: Reconstruimos el File desde base64 ---
                fileToProcess = base64ToFile(
                  lastImage.fileBase64,
                  lastImage.fileInfo?.name || "image",
                  lastImage.fileInfo?.type || "image/jpeg",
                );
              }
            }

            if (fileToProcess) {
              const { analyzeFileWithBackend } = await import(
                "../services/backendService"
              );

              try {
                const result = await analyzeFileWithBackend(
                  text,
                  fileToProcess,
                  enrichedSystemInstruction,
                  abortController.signal,
                );

                let aiResponseText = "";
                for await (const chunk of result.stream) {
                  if (abortController.signal.aborted) {
                    debugChat.log("Gemini file analysis aborted");
                    break;
                  }

                  aiResponseText += chunk.text();
                  get().updateMessage(
                    state.activeConversationId!,
                    aiMessageId,
                    {
                      text: aiResponseText,
                    },
                  );
                }
              } catch (fileError) {
                if (abortController.signal.aborted) {
                  debugChat.log("File analysis was aborted");
                } else {
                  throw fileError;
                }
              }
            } else {
              const { startChat, internetSearchTool, realTimeClockTool } =
                await import("../services/geminiService");
              const { performSearch } = await import(
                "../services/searchService"
              );

              const tools = state.isSearchEnabled
                ? [internetSearchTool, realTimeClockTool]
                : [realTimeClockTool];

              const chatSession = startChat(
                enrichedSystemInstruction,
                config.model,
                enrichedContext, // <-- Gemini también recibe el historial ya limpio
                tools,
              );
              set({ chat: chatSession });

              try {
                const result = await chatSession.sendMessageStream(text, {
                  signal: abortController.signal,
                });

                let aiResponseText = "";
                for await (const chunk of result.stream) {
                  if (abortController.signal.aborted) {
                    debugChat.log("Gemini chat stream aborted");
                    break;
                  }

                  const functionCalls = chunk.functionCalls();
                  if (functionCalls && functionCalls.length > 0) {
                    get().setSearching(true);
                    get().setCurrentTool(
                      functionCalls[0].name,
                      (functionCalls[0].args as any)?.query,
                    );

                    // Manejar tool calls con abort signal
                    const toolPromises = functionCalls.map(async (call) => {
                      if (abortController.signal.aborted) {
                        throw new Error("Aborted");
                      }

                      try {
                        if (call.name === "internetSearch") {
                          const searchResults = await performSearch(
                            (call.args as any).query,
                            abortController.signal,
                          );
                          return {
                            functionResponse: {
                              name: call.name,
                              response: {
                                results: searchResults.slice(0, 5).map((r) => ({
                                  title: r.title,
                                  snippet: r.snippet,
                                  link: r.link,
                                })),
                              },
                            },
                          };
                        } else if (call.name === "getCurrentTime") {
                          return {
                            functionResponse: {
                              name: call.name,
                              response: {
                                currentTime: new Date().toLocaleString(
                                  "es-ES",
                                  {
                                    timeZone: "Europe/Madrid",
                                  },
                                ),
                              },
                            },
                          };
                        }
                      } catch (toolError) {
                        if (abortController.signal.aborted) {
                          throw new Error("Aborted");
                        }
                        console.error(`Error en ${call.name}:`, toolError);
                        return {
                          functionResponse: {
                            name: call.name,
                            response: {
                              error: "Error ejecutando la herramienta",
                            },
                          },
                        };
                      }
                    });

                    try {
                      const responses = await Promise.all(toolPromises);

                      if (abortController.signal.aborted) {
                        debugChat.log("Tool responses aborted");
                        break;
                      }

                      const toolResultStream =
                        await chatSession.sendMessageStream(responses as any, {
                          signal: abortController.signal,
                        });

                      for await (const toolChunk of toolResultStream.stream) {
                        if (abortController.signal.aborted) {
                          debugChat.log("Tool result stream aborted");
                          break;
                        }

                        aiResponseText += toolChunk.text();
                        get().updateMessage(
                          state.activeConversationId!,
                          aiMessageId,
                          { text: aiResponseText },
                        );
                      }
                    } catch (toolError) {
                      if (abortController.signal.aborted) {
                        debugChat.log("Tool execution was aborted");
                      } else {
                        throw toolError;
                      }
                    }
                    return; // Exit after tool response
                  }

                  aiResponseText += chunk.text();
                  get().updateMessage(
                    state.activeConversationId!,
                    aiMessageId,
                    {
                      text: aiResponseText,
                    },
                  );
                }
              } catch (geminiError) {
                if (abortController.signal.aborted) {
                  debugChat.log("Gemini chat was aborted");
                } else {
                  throw geminiError;
                }
              }
            }
          }
        } catch (e) {
          const errorMsg = ChatValidator.detectAPIError(e);
          if (
            abortController.signal.aborted ||
            errorMsg.toLowerCase().includes("aborted") ||
            errorMsg.toLowerCase().includes("cancel")
          ) {
            debugChat.log("Generación cancelada por el usuario.");
            get().updateMessage(state.activeConversationId!, aiMessageId, {
              text: "Generación cancelada.",
            });
            get().showToast("Generación cancelada", "info");
          } else if (get().isLoading) {
            debugChat.error("SendMessage error:", errorMsg, e);
            get().setError(`Error: ${errorMsg}`);
            if (state.activeConversationId) {
              get().deleteMessage(state.activeConversationId, userMessage.id);
              get().deleteMessage(state.activeConversationId, aiMessageId);
              get().showToast("No se pudo enviar el mensaje", "error");
            }
          }
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
          if (get().isLoading) {
            get().setLoading(false);
            get().setSearching(false);
            get().setCurrentTool(null);
            get().setUsingPreviousImage(false);
          }
          set({ abortController: null });

          // Supabase saving logic
          if (supabase && state.activeConversationId) {
            try {
              const finalAiMessage = get().conversations[
                state.activeConversationId
              ]?.messages.find((m) => m.id === aiMessageId);
              if (
                finalAiMessage &&
                finalAiMessage.text.trim() &&
                finalAiMessage.text !== "..." &&
                finalAiMessage.text !== "Generación cancelada."
              ) {
                await get().saveToSupabase(
                  state.activeConversationId,
                  userMessage.text,
                  finalAiMessage.text,
                  {
                    personality:
                      get().conversations[state.activeConversationId!]
                        .personality,
                    hasFile: !!file,
                    fileType: file?.type,
                  },
                );
              }
            } catch (supabaseError) {
              console.error("Error guardando en Supabase:", supabaseError);
            }
          }
        }
      },

      changePersonality: (newPersonality) => {
        const state = get();
        if (!state.activeConversationId) {
          get().newConversation(newPersonality);
          return;
        }

        if (
          state.conversations[state.activeConversationId]?.personality !==
          newPersonality
        ) {
          get().updateConversation(state.activeConversationId, {
            personality: newPersonality,
          });
        }
      },

      selectConversation: (id) => {
        if (id !== get().activeConversationId) {
          get().setActiveConversationId(id);
          get().setSidebarOpen(false);
        }
      },

      toggleSidebar: () => {
        const state = get();
        get().setSidebarOpen(!state.isSidebarOpen);
      },

      toggleFullscreen: async () => {
        const state = get();
        if (!document.fullscreenElement) {
          try {
            await document.documentElement.requestFullscreen();
            get().setFullscreen(true);
          } catch (e) {
            console.error("Error al entrar en pantalla completa:", e);
          }
        } else {
          try {
            await document.exitFullscreen();
            get().setFullscreen(false);
          } catch (e) {
            console.error("Error al salir de pantalla completa:", e);
          }
        }
      },

      toggleSearch: () => {
        const state = get();
        get().setSearchEnabled(!state.isSearchEnabled);
      },

      // summary functions
      generateSummaryForConversation: async (conversationId: string) => {
        const state = get();
        const conversation = state.conversations[conversationId];
        if (
          !conversation ||
          !needsSummary(conversation, state.summaries[conversationId])
        ) {
          return;
        }

        set({ isGeneratingSummary: true });

        const MAX_RETRIES = 2;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const existingSummary = get().summaries[conversationId];
            const summaryText = await generateConversationSummary(
              conversation,
              existingSummary,
            );
            const newSummary = createConversationSummary(
              conversationId,
              summaryText,
              conversation.messages.length,
              existingSummary,
            );

            set((state) => ({
              summaries: {
                ...state.summaries,
                [conversationId]: newSummary,
              },
            }));

            get().showToast("Resumen de conversación actualizado", "success");
            lastError = null; // Limpiar error en caso de éxito
            break; // Salir del bucle si tiene éxito
          } catch (error) {
            lastError = error as Error;
            console.error(
              `Intento ${attempt}/${MAX_RETRIES} de generar resumen falló:`,
              error,
            );
            if (attempt < MAX_RETRIES) {
              await new Promise((resolve) => setTimeout(resolve, 1500)); // Esperar 1.5s
            }
          }
        }

        if (lastError) {
          console.error("Error final generando resumen:", lastError);
          get().showToast(
            `Error al generar resumen: ${lastError.message}`,
            "error",
          );
        }

        set({ isGeneratingSummary: false });
      },

      getSummaryForConversation: (conversationId: string) => {
        const state = get();
        return state.summaries[conversationId];
      },

      getEnrichedContextForConversation: (conversationId: string) => {
        const state = get();
        const conversation = state.conversations[conversationId];
        if (!conversation) return [];

        const summary = state.summaries[conversationId];
        return getEnrichedContext(conversation, summary);
      },

      backgroundSummaryGeneration: (conversationId: string) => {
        // Generar resumen en background sin bloquear la UI
        setTimeout(() => {
          get()
            .generateSummaryForConversation(conversationId)
            .catch(console.error);
        }, 2000);
      },

      // save interaction to supabase
      saveToSupabase: async (
        conversationId: string,
        userPrompt: string,
        aiResponse: string,
        metadata = {},
      ) => {
        if (!supabase) {
          console.log("Supabase no configurado, saltando guardado");
          return;
        }

        try {
          const { error } = await supabase
            .from("conversations_history")
            .insert({
              conversation_id: conversationId,
              user_prompt: userPrompt,
              ai_response: aiResponse,
              metadata: metadata,
            });

          if (error) {
            console.error("Error insertando en Supabase:", error);
            throw error;
          }
        } catch (error) {
          console.error("Error guardando en Supabase:", error);
          throw error;
        }
      },

      // get recent history for memory
      getRecentHistory: async (conversationId: string, limit = 3) => {
        return await getRecentHistory(conversationId, limit);
      },

      // get last image from conversation for visual memory
      getLastImageFromConversation: (conversationId: string) => {
        const state = get();
        const conversation = state.conversations[conversationId];
        if (!conversation) return null;

        // find last message with image/file (within last 10 messages for performance)
        const recentMessages = conversation.messages.slice(-10);
        for (let i = recentMessages.length - 1; i >= 0; i--) {
          const message = recentMessages[i];
          // --- MODIFICADO: Buscamos por fileBase64 en lugar de fileData ---
          if (
            message.fileBase64 &&
            message.fileInfo?.type.startsWith("image/")
          ) {
            debugChat.log(
              "Found previous image for context:",
              message.fileInfo.name,
            );
            return message;
          }
        }
        debugChat.log("No previous image found for visual context");
        return null;
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        conversations: state.conversations,
        summaries: state.summaries,
        activeConversationId: state.activeConversationId,
        isSearchEnabled: state.isSearchEnabled,
      }),
    },
  ),
);
