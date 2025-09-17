<<<<<<< HEAD
# Vortex Chat

Un chat con IA que hice usando React. Tiene dos modelos diferentes y funciona bastante bien.

## Qué hace

- Chat con Gemini (rápido) y GPT-4 (para código)
- Puedes subir imágenes y PDFs
- Guarda el historial en el navegador
- Respuestas en streaming
- Memoria a corto plazo (recuerda conversaciones anteriores)
- Memoria visual (mantiene imágenes en contexto entre mensajes)
- Análisis mejorado de imágenes con ejercicios matemáticos
- Sistema de validación para prevenir errores técnicos

## Como instalarlo

Necesitas Node.js instalado.

```bash
git clone https://github.com/Victor00128/Chatbot-Vortex.git
cd Chatbot-Vortex
npm install
```

Crea un archivo `.env.local` con tus API keys:

```
VITE_GEMINI_API_KEY=tu_key_aqui
VITE_OPENAI_API_KEY=tu_key_aqui
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

Consigue las keys en:
- Gemini: https://aistudio.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys
- Supabase: https://supabase.com/dashboard (crea proyecto y ve a Settings > API)

Ejecuta:

```bash
npm run dev
```

Abre http://localhost:5173

## Tecnologías

- React + TypeScript + Vite
- Zustand para state management
- React Markdown para mostrar respuestas
- APIs de Google Gemini y OpenAI
- Sistema de debug y validación integrado

## Memoria del Chatbot

Si configuras Supabase, el chatbot recordará tus conversaciones anteriores automáticamente. Usa las últimas 3 interacciones como contexto para respuestas más coherentes.

Sin Supabase = solo memoria de la sesión actual
Con Supabase = memoria entre sesiones

## Memoria Visual

El chatbot ahora recuerda las imágenes que envías durante toda la conversación:

### Cómo funciona:
1. **Envías imagen**: "Resuelve el ejercicio 8a" → ✅ Analiza correctamente
2. **Sigues preguntando**: "Ahora resuelve el inciso b)" → ✅ Usa la misma imagen automáticamente
3. **Referencias**: "Mira la foto que envié", "El mismo ejercicio", "La imagen anterior" → ✅ Funciona

### Palabras que activan la memoria visual:
- "mismo", "anterior", "imagen", "foto", "ejercicio", "inciso" 
- "mira", "ves", "archivo", "documento", "problema"
- "ahora", "también", "arriba", "envié", "enviaste"

### Beneficios:
- **Conversaciones naturales**: No necesitas reenviar la imagen
- **Ejercicios multi-parte**: Perfecto para problemas con varios incisos  
- **Análisis continuo**: Mantiene el contexto visual durante toda la charla

## Mejoras Implementadas

### Memoria Visual Persistente
- Mantiene imágenes en contexto durante toda la conversación
- Detección inteligente de referencias a imágenes anteriores
- Indicador visual cuando usa imagen previa
- Perfecto para ejercicios con múltiples incisos

### Análisis de Imágenes Mejorado
- Lee correctamente números de ejercicios e incisos
- Identifica exactamente qué problema resolver
- Mejor manejo de ejercicios matemáticos (determinantes, matrices)
- Instrucciones específicas para matemáticas con LaTeX

### Arreglos Técnicos
- Solucionado error "First content should be with role 'user'"
- Validación automática del historial de conversación
- Limpieza inteligente de mensajes duplicados
- Sistema de debug para desarrolladores

### Análisis Matemático
- Cálculo correcto de determinantes 3x3
- Uso de cofactores y regla de Sarrus
- Análisis paso a paso de ejercicios
- Identificación precisa de problemas en imágenes

## Notas

- El historial se guarda en tu navegador + Supabase (opcional)
- Las imágenes se mantienen en memoria durante la conversación actual
- Necesitas internet para que funcione
- Las API keys van en .env.local (no las subas a git)
- En modo desarrollo se activan logs de debug adicionales
- Si hay errores técnicos, revisa la consola del navegador

Eso es todo. Si algo no funciona, revisa que las keys estén bien.
=======
# Documento-
>>>>>>> cafa0e4a749045fc30d18e3215071324c4f77b3d
