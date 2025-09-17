import {
  GoogleGenerativeAI,
  GenerateContentResult,
  SystemInstruction,
} from "@google/generative-ai";
import { fileToGenerativePart } from "./geminiService";

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
  try {
    const apiKey = getApiKey();
    return new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error("Error inicializando Google AI para análisis de archivos:", error);
    throw error;
  }
}

export async function analyzeFileWithBackend(
  prompt: string,
  file: File,
  systemInstruction: SystemInstruction,
  signal?: AbortSignal, // Parámetro para abortar la petición
): Promise<GenerateContentResult> {
  // Validaciones de entrada
  if (!file) {
    throw new Error("No se proporcionó ningún archivo para analizar");
  }

  if (file.size === 0) {
    throw new Error("El archivo está vacío");
  }

  if (file.size > 20 * 1024 * 1024) { // 20MB limit
    throw new Error("El archivo es demasiado grande (máximo 20MB)");
  }

  if (!prompt || typeof prompt !== 'string') {
    prompt = "Analiza esta imagen con cuidado. Si contiene ejercicios matemáticos, identifica exactamente qué ejercicio y inciso me están pidiendo resolver. Lee bien los números de ejercicio. Si es un problema de matemáticas, resuélvelo paso a paso usando las fórmulas correctas. Para matrices 3x3 calcula el determinante usando cofactores o regla de Sarrus.";
  }

  try {
    const genAI = getGoogleAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      systemInstruction: systemInstruction,
    });

    // Iniciar una sesión de chat para poder pasar el AbortSignal
    const chat = model.startChat();

    // función auxiliar para convertir el archivo
    let filePart;
    try {
      filePart = await fileToGenerativePart(file);
    } catch (fileError) {
      console.error("Error procesando archivo:", fileError);
      throw new Error(`Error al procesar el archivo: ${fileError instanceof Error ? fileError.message : 'Error desconocido'}`);
    }

    const fullPrompt = prompt.trim();

    // Configurar timeout para la operación
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      timeoutController.abort();
    }, 60000); // 60 segundos timeout

    // Combinar señales de abort
    const combinedSignal = signal || timeoutController.signal;

    try {
      // Enviar mensaje con stream y signal
      const result = await chat.sendMessageStream([fullPrompt, filePart], { 
        signal: combinedSignal 
      });
      
      clearTimeout(timeoutId);
      return result;
    } catch (streamError) {
      clearTimeout(timeoutId);
      throw streamError;
    }

  } catch (error) {
    console.error("Error al analizar el archivo:", error);

    let errorMessage = "Error desconocido al procesar el archivo";
    
    if (error instanceof Error) {
      // Manejo específico de errores
      if (error.message.includes("API key") || error.message.includes("configurada")) {
        errorMessage = "Error de configuración: Clave de API no válida o no configurada";
      } else if (error.message.includes("quota") || error.message.includes("limit")) {
        errorMessage = "Error de cuota: Se ha excedido el límite de la API de Gemini";
      } else if (
        error.message.includes("400") ||
        error.message.includes("Malformed") ||
        error.message.includes("UNSUPPORTED_FILE_FORMAT")
      ) {
        errorMessage = "Formato de archivo no soportado o el archivo puede estar corrupto";
      } else if (
        error.message.toLowerCase().includes("aborted") ||
        error.name === 'AbortError'
      ) {
        errorMessage = "La generación de la respuesta fue cancelada";
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Error de conexión. Verifica tu conexión a internet";
      } else if (error.message.includes("timeout")) {
        errorMessage = "La operación tardó demasiado tiempo y fue cancelada";
      } else if (error.message.includes("archivo")) {
        errorMessage = error.message; // Ya es un mensaje de error de archivo procesado
      } else {
        errorMessage = `Error al procesar el archivo: ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
  }
}
