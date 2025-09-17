import React, { useState, useRef, useEffect } from "react";
import { useChatStore } from "../store/chatStore";
import { PERSONALITIES } from "../types";
import { useChatTranslation } from "../src/i18n/useTranslation";
import "../styles/animations.css";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

const ChatInput: React.FC = () => {
  const { t, getPlaceholder, getAttachmentText } = useChatTranslation();
  const {
    sendMessage,
    isLoading,
    conversations,
    activeConversationId,
    stopGeneration,
    // drag & drop / file centralizado
    fileForUpload,
    setFileForUpload,
  } = useChatStore() as any; // extendido con fileForUpload

  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevLoadingRef = useRef(isLoading);
  const recognitionRef = useRef<any>(null);

  const activeConversation = activeConversationId
    ? conversations[activeConversationId]
    : null;
  const personalityType = activeConversation
    ? PERSONALITIES[activeConversation.personality].type
    : "chat";

  // auto focus cuando termina la IA
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  // focus al cambiar chat
  useEffect(() => {
    if (activeConversationId && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [activeConversationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if ((trimmed || fileForUpload) && !isLoading) {
      sendMessage(trimmed, fileForUpload ?? undefined);
      setInput("");
      setFileForUpload(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileForUpload(e.target.files[0]);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
    if (!isFocused) setIsFocused(true);
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

  // Speech-to-Text (Web Speech API)
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = document.documentElement.lang || "es-ES";

    rec.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          finalTranscript += transcript;
        }
      }
      if (finalTranscript) {
        setInput((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      }
    };
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
  }, []);

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      rec.stop();
      setIsListening(false);
    } else {
      try {
        rec.start();
        setIsListening(true);
      } catch {
        // algunos navegadores lanzan si ya está corriendo
      }
    }
  };

  const placeholderText = getPlaceholder(!!fileForUpload);

  return (
    <div className="bg-zinc-900/70 backdrop-blur-sm p-2 sm:p-4 border-t border-zinc-700 transition-all">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        {fileForUpload && (
          <div className="mb-2 flex items-center justify-between bg-zinc-800 p-2 rounded-lg text-sm min-w-0 animate-message-in">
            <span className="text-gray-300 break-all min-w-0 pr-2 flex-1">
              {getAttachmentText(fileForUpload.name)}
            </span>
            <button
              type="button"
              onClick={() => {
                setFileForUpload(null);
                setTimeout(() => textareaRef.current?.focus(), 100);
              }}
              className="text-red-500 hover:text-red-400 font-bold ml-2 flex-shrink-0 transition-colors hover-scale micro-bounce"
              aria-label={t("chatInput.removeAttachment")}
            >
              &times;
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {personalityType !== "image" && (
            <button
              type="button"
              onClick={triggerFileSelect}
              disabled={isLoading}
              className="p-3 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 focus-ring button-hover-lift micro-bounce ripple-effect"
              aria-label={t("chatInput.attachFile")}
              title={t("chatInput.attachFile")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81" />
              </svg>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading || personalityType === "image"}
            accept="image/*,application/pdf"
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholderText}
            disabled={isLoading}
            className={`flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-300 disabled:opacity-50 resize-none max-h-40 overflow-y-auto focus-ring ${
              isFocused ? "ring-2 ring-blue-500/20 bg-zinc-750" : ""
            }`}
            autoComplete="off"
            rows={1}
            onKeyDown={handleTextareaKeyDown}
            onInput={handleTextareaInput}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />

          {/* Botón micrófono */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={isLoading || !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)}
            className={`p-3 rounded-2xl text-white focus-ring micro-bounce ripple-effect ${isListening ? "bg-green-600 hover:bg-green-700" : "bg-zinc-700 hover:bg-zinc-600"}`}
            aria-label={isListening ? "Detener dictado" : "Iniciar dictado"}
            title={isListening ? "Detener dictado" : "Dictar por voz"}
          >
            {isListening ? (
              // icono stop
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M5.25 6.75A3.75 3.75 0 019 3h6a3.75 3.75 0 013.75 3.75v6A3.75 3.75 0 0115 16.5H9a3.75 3.75 0 01-3.75-3.75v-6z" clipRule="evenodd" /></svg>
            ) : (
              // icono mic
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6.75 6.75 0 006.75-6.75M18.75 12h.008v.008H18.75V12zm-13.5 0a6.75 6.75 0 006.75 6.75m0 0v3m0-3a6.75 6.75 0 01-6.75-6.75m6.75-6a2.25 2.25 0 00-2.25 2.25v4.5a2.25 2.25 0 004.5 0v-4.5A2.25 2.25 0 0012 5.25z" />
              </svg>
            )}
          </button>

          {/* Botón Enviar / Parar */}
          <button
            type={isLoading ? "button" : "submit"}
            onClick={isLoading ? stopGeneration : undefined}
            disabled={!isLoading && !input.trim() && !fileForUpload}
            className={`p-3 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all duration-300 flex-shrink-0 focus-ring button-hover-lift micro-bounce ripple-effect ${
              isLoading
                ? "bg-red-500 hover:bg-red-600 focus:ring-red-500"
                : "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed"
            }`}
            aria-label={isLoading ? t("chatInput.stopGeneration") : t("chatInput.sendMessage")}
            title={isLoading ? t("chatInput.stopGeneration") : t("chatInput.sendMessage")}
          >
            {isLoading ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;