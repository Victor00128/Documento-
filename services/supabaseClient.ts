import { createClient } from "@supabase/supabase-js";

// Configuración segura de Supabase
const getSupabaseConfig = (): { url: string; key: string } | null => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Si no están configuradas, retornar null (modo sin Supabase)
  if (!supabaseUrl || !supabaseKey) {
    console.info("Supabase no está configurado - funcionando en modo local");
    return null;
  }

  // Validar formato de URL
  if (typeof supabaseUrl !== 'string' || !supabaseUrl.trim()) {
    console.error("VITE_SUPABASE_URL está vacía o no es válida");
    return null;
  }

  if (typeof supabaseKey !== 'string' || !supabaseKey.trim()) {
    console.error("VITE_SUPABASE_ANON_KEY está vacía o no es válida");
    return null;
  }

  // Validar que la URL tenga formato correcto
  try {
    new URL(supabaseUrl.trim());
  } catch (error) {
    console.error("VITE_SUPABASE_URL no tiene un formato de URL válido:", supabaseUrl);
    return null;
  }

  return {
    url: supabaseUrl.trim(),
    key: supabaseKey.trim()
  };
};

// Inicializar cliente de Supabase de forma segura
const initializeSupabase = () => {
  try {
    const config = getSupabaseConfig();
    
    if (!config) {
      return null;
    }

    return createClient(config.url, config.key, {
      auth: {
        persistSession: false, // No persistir sesión para mayor seguridad
      },
      global: {
        headers: {
          'X-Client-Info': 'vortex-chat'
        }
      }
    });
  } catch (error) {
    console.error("Error inicializando Supabase:", error);
    return null;
  }
};

export const supabase = initializeSupabase();

// get recent history for context
export async function getRecentHistory(conversationId: string, limit = 5) {
  if (!supabase) {
    console.log("Supabase no configurado, usando memoria local");
    return [];
  }

  if (!conversationId || typeof conversationId !== 'string' || conversationId.trim().length === 0) {
    console.warn("ID de conversación no válido para obtener historial");
    return [];
  }

  if (typeof limit !== 'number' || limit < 1 || limit > 100) {
    console.warn("Límite no válido, usando valor por defecto");
    limit = 5;
  }

  try {
    const { data, error } = await supabase
      .from("conversations_history")
      .select("user_prompt, ai_response, created_at")
      .eq("conversation_id", conversationId.trim())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error obteniendo historial de Supabase:", error);
      
      // Manejo específico de errores comunes
      if (error.code === 'PGRST116') {
        console.warn("Tabla conversations_history no existe en Supabase");
      } else if (error.code === '42501') {
        console.warn("Sin permisos para acceder a conversations_history");
      }
      
      return [];
    }

    if (!data || !Array.isArray(data)) {
      console.warn("Datos de historial no válidos recibidos de Supabase");
      return [];
    }

    // Validar y limpiar los datos
    const validData = data
      .filter(item => 
        item && 
        typeof item === 'object' && 
        item.user_prompt && 
        item.ai_response &&
        item.created_at
      )
      .map(item => ({
        user_prompt: String(item.user_prompt).substring(0, 1000), // Limitar longitud
        ai_response: String(item.ai_response).substring(0, 2000), // Limitar longitud
        created_at: item.created_at
      }));

    return validData.reverse() || [];
  } catch (error) {
    console.error("Error inesperado obteniendo historial:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        console.warn("Error de conexión con Supabase, usando memoria local");
      }
    }
    
    return [];
  }
}

// Función helper para verificar si Supabase está disponible
export const isSupabaseAvailable = (): boolean => {
  return supabase !== null;
};

// Función helper para obtener el estado de la conexión
export const getSupabaseStatus = (): { 
  available: boolean; 
  configured: boolean; 
  error?: string 
} => {
  const config = getSupabaseConfig();
  
  return {
    available: supabase !== null,
    configured: config !== null,
    error: !config ? "Variables de entorno no configuradas" : undefined
  };
};
