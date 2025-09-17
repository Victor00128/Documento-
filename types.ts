export enum Sender {
  User = "user",
  AI = "ai",
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  imageUrl?: string;
  fileInfo?: { name: string; type: string; size: number };
  fileData?: File; // Añadido para poder pasar el archivo real a los servicios
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastModified: number;
  personality: AIPersonality;
  userProfile?: string;
  summary?: ConversationSummary;
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  summary: string;
  messageCount: number;
  lastUpdated: number;
  version: number;
  topics?: string[];
}

export type AIPersonality = "flash" | "developer";

export const PERSONALITY_ORDER: AIPersonality[] = ["flash", "developer"];

export interface AIPersonalityConfig {
  name: string;
  provider: "google" | "openai"; // Ahora la app conoce dos proveedores
  model: string;
  type: "chat" | "image" | "rag";
  systemInstruction: string;
  welcomeMessage: string;
}

const flashSystemInstruction =
  "Eres un asistente que ayuda con cualquier tema. Cuando veas imágenes con ejercicios, lee bien el número del ejercicio y el inciso que te piden. Si es matemáticas, analiza paso a paso y usa LaTeX entre $ o $$. Para determinantes de matrices 3x3 usa cofactores o regla de Sarrus. Siempre lee la imagen completa antes de responder.";

export const PERSONALITIES: Record<AIPersonality, AIPersonalityConfig> = {
  flash: {
    name: "Modelo Flash",
    provider: "google",
    model: "gemini-1.5-flash",
    type: "chat",
    systemInstruction: flashSystemInstruction,
    welcomeMessage: "Hola! ¿En qué te ayudo?",
  },
  developer: {
    name: "Modelo Desarrollador",
    provider: "openai",
    model: "gpt-4o-mini",
    type: "chat",
    systemInstruction:
      "Eres un programador que también sabe matemáticas. Si ves imágenes con ejercicios, identifica bien cual te piden resolver. Para matemáticas usa LaTeX y explica los pasos. Para código usa markdown. Lee las imágenes con cuidado antes de responder.",
    welcomeMessage: "Hey! ¿Qué vamos a programar?",
  },
};
