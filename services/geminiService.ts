import {
  GoogleGenerativeAI,
  ChatSession,
  GenerativeModel,
  FunctionDeclarationsTool,
} from "@google/generative-ai";

// internet search tool
export const internetSearchTool: FunctionDeclarationsTool = {
  functionDeclarations: [
    {
      name: "internetSearch",
      description:
        "Busca en internet información en tiempo real sobre un tema específico. Úsalo para eventos recientes, precios, resultados deportivos, etc.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: {
            type: "STRING",
            description:
              "La consulta de búsqueda precisa para obtener la información.",
          },
        },
        required: ["query"],
      },
    },
  ],
};

// real time clock tool
export const realTimeClockTool: FunctionDeclarationsTool = {
  functionDeclarations: [
    {
      name: "getCurrentTime",
      description:
        "Obtiene la fecha y hora actual. Úsala para responder cualquier pregunta sobre la fecha, el día de la semana, la hora actual o cualquier consulta temporal.",
      parameters: {
        type: "OBJECT",
        properties: {},
        required: [],
      },
    },
  ],
};

let genAI: GoogleGenerativeAI | undefined;

// Configuración segura de API keys
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY no está configurada en las variables de entorno");
    throw new Error(
      "La clave de API de Gemini no está configurada. Por favor, configura VITE_GEMINI_API_KEY en tu archivo .env"
    );
  }
  
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    console.error("VITE_GEMINI_API_KEY está vacía o no es válida");
    throw new Error(
      "La clave de API de Gemini no es válida. Verifica que VITE_GEMINI_API_KEY esté correctamente configurada"
    );
  }
  
  return apiKey.trim();
};

function getGoogleAI(): GoogleGenerativeAI {
  if (!genAI) {
    try {
      const apiKey = getApiKey();
      genAI = new GoogleGenerativeAI(apiKey);
    } catch (error) {
      console.error("Error inicializando Google AI:", error);
      throw error;
    }
  }
  return genAI;
}

export function startChat(
  systemInstruction: string,
  model: string,
  history?: any[],
  tools?: FunctionDeclarationsTool[],
): ChatSession {
  try {
    const genAI = getGoogleAI();
    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: systemInstruction,
      tools: tools,
    });

    // format history if exists
    const formattedHistory = history
      ? history.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.parts[0].text }],
        }))
      : [];

    const chatSession = generativeModel.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    return chatSession;
  } catch (error) {
    console.error("Error iniciando chat con Gemini:", error);
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Error de configuración: Clave de API de Gemini no válida o no configurada");
      }
      if (error.message.includes("quota") || error.message.includes("limit")) {
        throw new Error("Error de cuota: Se ha excedido el límite de la API de Gemini");
      }
    }
    throw new Error(`Error al inicializar el chat: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Generates a single, non-streamed response from the AI.
 * Useful for background tasks like summarizing or analyzing text.
 * @param prompt The text prompt to send to the model.
 * @param model The model to use for generation (ignored, always uses gemini-1.5-flash).
 * @returns The generated text content.
 */
export async function generateContent(
  prompt: string,
  model: string,
): Promise<string> {
  try {
    const genAI = getGoogleAI();
    const generativeModel: GenerativeModel = genAI.getGenerativeModel({
      model: model,
    });

    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generando contenido con Gemini:", error);
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        throw new Error("Error de configuración: Clave de API de Gemini no válida");
      }
      if (error.message.includes("quota") || error.message.includes("limit")) {
        throw new Error("Error de cuota: Se ha excedido el límite de la API de Gemini");
      }
      if (error.message.includes("400") || error.message.includes("invalid")) {
        throw new Error("Error de solicitud: El prompt o modelo no es válido");
      }
    }
    throw new Error(`Error generando contenido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Converts a File object to a GoogleGenerativeAI.Part object.
 * @param file The file to convert.
 * @returns A promise that resolves with the Part object.
 */
export async function fileToGenerativePart(
  file: File,
): Promise<{ inlineData: { data: string; mimeType: string } }> {
  try {
    if (!file) {
      throw new Error("No se proporcionó ningún archivo");
    }

    if (file.size === 0) {
      throw new Error("El archivo está vacío");
    }

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      throw new Error("El archivo es demasiado grande (máximo 20MB)");
    }

    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const result = reader.result as string;
          if (!result || !result.includes(',')) {
            reject(new Error("Error al leer el archivo"));
            return;
          }
          resolve(result.split(",")[1]);
        } catch (error) {
          reject(new Error("Error procesando el archivo"));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsDataURL(file);
    });

    const data = await base64EncodedDataPromise;
    
    if (!data) {
      throw new Error("No se pudo convertir el archivo a base64");
    }

    return {
      inlineData: {
        data,
        mimeType: file.type || 'application/octet-stream',
      },
    };
  } catch (error) {
    console.error("Error convirtiendo archivo:", error);
    throw error instanceof Error ? error : new Error("Error desconocido al procesar el archivo");
  }
}
