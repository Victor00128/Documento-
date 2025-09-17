// services/openaiService.ts

import { ChatMessage, Sender, AIPersonalityConfig } from "../types";

// Configuración segura de API keys
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error("VITE_OPENAI_API_KEY no está configurada en las variables de entorno");
    throw new Error(
      "La clave de API de OpenAI no está configurada. Por favor, configura VITE_OPENAI_API_KEY en tu archivo .env"
    );
  }
  
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    console.error("VITE_OPENAI_API_KEY está vacía o no es válida");
    throw new Error(
      "La clave de API de OpenAI no es válida. Verifica que VITE_OPENAI_API_KEY esté correctamente configurada"
    );
  }
  
  return apiKey.trim();
};

// convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (!file) {
        reject(new Error("No se proporcionó ningún archivo"));
        return;
      }

      if (file.size === 0) {
        reject(new Error("El archivo está vacío"));
        return;
      }

      if (file.size > 20 * 1024 * 1024) { // 20MB limit
        reject(new Error("El archivo es demasiado grande (máximo 20MB)"));
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        try {
          const result = reader.result as string;
          if (!result) {
            reject(new Error("Error al leer el archivo"));
            return;
          }
          resolve(result);
        } catch (error) {
          reject(new Error("Error procesando el archivo"));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Error desconocido al procesar el archivo"));
    }
  });
};

// generator output type
export type OpenAIStreamOutput =
  | { type: "text"; value: string }
  | {
      type: "tool_call";
      value: { id: string; function: { name: string; arguments: string } }[];
    };

// main function that talks to OpenAI and returns streaming response
export async function* getOpenAIStream(
  config: AIPersonalityConfig,
  history: ChatMessage[],
  userMessage: ChatMessage,
  tools?: any[], // Parámetro para las herramientas
  toolResult?: any[], // accept array of tool results
  signal?: AbortSignal, // Parámetro para abortar la petición
): AsyncGenerator<OpenAIStreamOutput> {
  let apiKey: string;
  
  try {
    apiKey = getApiKey();
  } catch (error) {
    console.error("Error obteniendo API key de OpenAI:", error);
    throw error;
  }

  // Crear un AbortController combinado si no se proporciona signal
  let abortController: AbortController | undefined;
  let combinedSignal = signal;

  if (!signal) {
    abortController = new AbortController();
    combinedSignal = abortController.signal;
  }

  // Timeout de seguridad
  const timeoutId = setTimeout(() => {
    if (abortController) {
      abortController.abort("Request timeout");
    }
  }, 60000); // 60 segundos

  try {
    // format chat history for OpenAI API
    const messages: any[] = history
      .filter((m) => m.id !== "initial-message")
      .map((msg) => ({
        role: msg.sender === Sender.User ? "user" : "assistant",
        content: msg.text,
      }));

    // user message
    let userContent: any;
    if (
      userMessage.fileInfo &&
      userMessage.fileData &&
      userMessage.fileInfo.type.startsWith("image/")
    ) {
      try {
        const base64Image = await fileToBase64(userMessage.fileData);
        userContent = [
          { type: "text", text: userMessage.text },
          { type: "image_url", image_url: { url: base64Image } },
        ];
      } catch (fileError) {
        console.error("Error procesando imagen:", fileError);
        throw new Error(`Error al procesar la imagen: ${fileError instanceof Error ? fileError.message : 'Error desconocido'}`);
      }
    } else {
      userContent = userMessage.text;
    }
    messages.push({ role: "user", content: userContent });

    // add tool result if exists
    if (toolResult && toolResult.length > 0) {
      messages.push(...toolResult);
    }

    // build request body
    const body: any = {
      model: config.model,
      messages: [
        { role: "system", content: config.systemInstruction },
        ...messages,
      ],
      stream: true,
    };

    // add tools if available
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    // API request con AbortSignal
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: combinedSignal, // <-- ESTA ES LA LÍNEA CLAVE QUE FALTABA. Se pasa la señal de aborto a fetch.
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (parseError) {
        console.warn("No se pudo parsear el error de OpenAI:", parseError);
      }

      // Manejo específico de errores comunes
      if (response.status === 401) {
        throw new Error("Error de autenticación: Clave de API de OpenAI no válida");
      } else if (response.status === 429) {
        throw new Error("Error de cuota: Se ha excedido el límite de la API de OpenAI");
      } else if (response.status === 400) {
        throw new Error(`Error de solicitud: ${errorMessage}`);
      } else if (response.status >= 500) {
        throw new Error("Error del servidor de OpenAI. Intenta de nuevo más tarde");
      }
      
      throw new Error(`Error de OpenAI: ${errorMessage}`);
    }

    // process streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No se pudo leer la respuesta del servidor de OpenAI");
    }

    const decoder = new TextDecoder();
    let toolCalls: any[] = [];

    try {
      while (true) {
        // Verificar si fue abortado antes de cada lectura
        if (combinedSignal?.aborted) {
          console.log("OpenAI stream aborted by signal");
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk
          .split("\n")
          .filter((line) => line.trim().startsWith("data: "));

        for (const line of lines) {
          // Verificar abort signal en cada línea
          if (combinedSignal?.aborted) {
            console.log("OpenAI stream aborted during line processing");
            return;
          }

          const jsonStr = line.replace("data: ", "");
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              yield { type: "text", value: delta.content };
            }

            if (delta?.tool_calls) {
              // accumulate tool call fragments
              delta.tool_calls.forEach((toolCall: any) => {
                if (toolCalls[toolCall.index]) {
                  toolCalls[toolCall.index].function.arguments +=
                    toolCall.function.arguments || "";
                } else {
                  toolCalls[toolCall.index] = {
                    id: toolCall.id,
                    type: "function",
                    function: {
                      name: toolCall.function?.name || "",
                      arguments: toolCall.function?.arguments || "",
                    },
                  };
                }
              });
            }
          } catch (parseError) {
            console.warn("Error parsing OpenAI stream line:", parseError);
          }
        }
      }

      // yield accumulated tool calls at the end
      if (toolCalls.length > 0) {
        yield {
          type: "tool_call",
          value: toolCalls.filter(Boolean),
        };
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (combinedSignal?.aborted) {
      console.log("OpenAI request was aborted:", (error as Error).message);
      // No lanzamos error si fue un aborto intencional
      return;
    }
    console.error("Error in OpenAI stream:", error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}