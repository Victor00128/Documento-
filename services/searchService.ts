export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

// Configuración segura de API keys
const getApiKey = (): string => {
  const apiKey = import.meta.env.VITE_SERPER_API_KEY;

  if (!apiKey) {
    console.warn(
      "VITE_SERPER_API_KEY no está configurada - la búsqueda en internet estará deshabilitada",
    );
    throw new Error(
      "La clave de API de Serper no está configurada. La búsqueda en internet no estará disponible",
    );
  }

  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    console.error("VITE_SERPER_API_KEY está vacía o no es válida");
    throw new Error(
      "La clave de API de Serper no es válida. Verifica que VITE_SERPER_API_KEY esté correctamente configurada",
    );
  }

  return apiKey.trim();
};

export const performSearch = async (
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> => {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("La consulta de búsqueda no puede estar vacía");
  }

  if (query.length > 500) {
    throw new Error(
      "La consulta de búsqueda es demasiado larga (máximo 500 caracteres)",
    );
  }

  let apiKey: string;

  try {
    apiKey = getApiKey();
  } catch (error) {
    console.error("Error obteniendo API key de Serper:", error);
    throw error;
  }

  // --- MODIFICADO: Usar señal externa si se proporciona, si no, crear un timeout ---
  let controller: AbortController | undefined;
  let finalSignal = signal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  if (!finalSignal) {
    controller = new AbortController();
    finalSignal = controller.signal;
    timeoutId = setTimeout(() => controller!.abort(), 10000); // 10 segundos timeout
  }
  // --- FIN DE LA MODIFICACIÓN ---

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query.trim(),
        num: 10, // Limitar resultados
        gl: "es", // Geolocalización España
        hl: "es", // Idioma español
      }),
      signal: finalSignal, // <-- Usar la señal final
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorBody = await response.text();
        if (errorBody) {
          console.error("Error detallado de Serper:", errorBody);

          // Intentar parsear como JSON para obtener más detalles
          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch (parseError) {
            // Si no es JSON válido, usar el texto completo si es corto
            if (errorBody.length < 200) {
              errorMessage = errorBody;
            }
          }
        }
      } catch (textError) {
        console.warn("No se pudo leer el cuerpo del error:", textError);
      }

      // Manejo específico de errores comunes
      if (response.status === 401) {
        throw new Error(
          "Error de autenticación: Clave de API de Serper no válida",
        );
      } else if (response.status === 429) {
        throw new Error(
          "Error de cuota: Se ha excedido el límite de la API de Serper",
        );
      } else if (response.status === 400) {
        throw new Error(`Error de solicitud: ${errorMessage}`);
      } else if (response.status >= 500) {
        throw new Error(
          "Error del servidor de Serper. Intenta de nuevo más tarde",
        );
      }

      throw new Error(`Error de la API de Serper: ${errorMessage}`);
    }

    const data = await response.json();

    // Validar la estructura de la respuesta
    if (!data || typeof data !== "object") {
      throw new Error("Respuesta inválida de la API de Serper");
    }

    // Devuelve solo los resultados orgánicos que son los más relevantes para un resumen
    const results = data.organic || [];

    if (!Array.isArray(results)) {
      console.warn(
        "La respuesta de Serper no contiene resultados orgánicos válidos",
      );
      return [];
    }

    // Validar y limpiar los resultados
    return results
      .filter(
        (result: any) =>
          result &&
          typeof result === "object" &&
          result.title &&
          result.link &&
          result.snippet,
      )
      .map((result: any, index: number) => ({
        title: String(result.title).substring(0, 200), // Limitar longitud
        link: String(result.link),
        snippet: String(result.snippet).substring(0, 500), // Limitar longitud
        position: result.position || index + 1,
      }))
      .slice(0, 10); // Limitar a 10 resultados máximo
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    // --- MODIFICADO: No loguear el error si es un aborto intencional ---
    if (error instanceof Error && error.name === "AbortError") {
      // No es un error real si fue cancelado, simplemente se relanza para que el llamador lo maneje
      throw error;
    }
    // --- FIN DE LA MODIFICACIÓN ---

    console.error("Error al realizar la búsqueda en internet:", error);

    if (error instanceof Error) {
      // Si ya es un error manejado, re-lanzarlo
      if (error.message.includes("API") || error.message.includes("Error de")) {
        throw error;
      }

      // Manejo de errores específicos
      if (error.name === "AbortError") {
        throw new Error("La búsqueda tardó demasiado tiempo y fue cancelada");
      }

      if (
        error.message.includes("fetch") ||
        error.message.includes("network")
      ) {
        throw new Error(
          "Error de conexión al realizar la búsqueda. Verifica tu conexión a internet",
        );
      }

      if (error.message.includes("JSON")) {
        throw new Error("Error procesando la respuesta de búsqueda");
      }
    }

    throw new Error(
      `Error inesperado al realizar la búsqueda: ${error instanceof Error ? error.message : "Error desconocido"}`,
    );
  }
};
