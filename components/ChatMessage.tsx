import React, { useState, useRef, useEffect } from "react";
import { Sender, ChatMessage as Message } from "../types";
import FormattedMessage from "./FormattedMessage";
import FileIcon from "./FileIcon";
import { useChatStore } from "../store/chatStore";
import { useChatTranslation } from "../src/i18n/useTranslation";

// --- Íconos para la Barra de Herramientas ---
const CopyIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5 .124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
    />
  </svg>
);

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

// NUEVO ÍCONO DE REGENERAR - Reemplazado
const RegenerateIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-4 h-4"
  >
    <path d="M 2 2 L 4.9414062 4.9414062 C 3.1620561 6.7129386 2 9.209162 2 12 C 2 17.533333 6.4666667 22 12 22 C 17.533333 22 22 17.533333 22 12 C 22 6.466667 17.533333 2 12 2 L 12 4 C 16.466667 4 20 7.5333333 20 12 C 20 16.466667 16.466667 20 12 20 C 7.5333333 20 4 16.466667 4 12 C 4 9.7594337 4.9364614 7.7627686 6.3535156 6.3535156 L 9 9 L 9 2 L 2 2 z" />
  </svg>
);

const DeleteIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="w-4 h-4 text-red-400"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

interface ChatMessageProps {
  message: Message;
  isLastMessage?: boolean;
  isLastUserMessage?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(
  ({ message, isLastMessage = false, isLastUserMessage = false }) => {
    const { t } = useChatTranslation();
    const isUser = message.sender === Sender.User;
    const {
      activeConversationId,
      editingMessageId,
      startEditingMessage,
      stopEditingMessage,
      editAndResendMessage,
      regenerateLastResponse,
      deleteMessage,
      showToast,
      isLoading,
    } = useChatStore();

    const [isToolbarVisible, setIsToolbarVisible] = useState(false);
    const [localEditText, setLocalEditText] = useState(message.text);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isEditing = editingMessageId === message.id;

    // --- Handlers ---
    const handleCopy = () => {
      navigator.clipboard.writeText(message.text);
      showToast(t("success.messageCopied"), "success");
      setIsToolbarVisible(false);
    };

    const handleDelete = () => {
      if (activeConversationId) {
        deleteMessage(activeConversationId, message.id);
        showToast(t("success.conversationDeleted"), "info");
      }
      setIsToolbarVisible(false);
    };

    const handleEditClick = () => {
      if (isUser && isLastUserMessage) {
        startEditingMessage(message.id, message.text);
        setLocalEditText(message.text);
      }
      setIsToolbarVisible(false);
    };

    const handleRegenerate = () => {
      regenerateLastResponse();
      setIsToolbarVisible(false);
    };

    const handleEditSave = () => {
      if (localEditText.trim() && localEditText !== message.text) {
        editAndResendMessage(message.id, localEditText);
      } else {
        stopEditingMessage();
      }
    };

    // --- Eventos para la barra de herramientas ---
    const handleMouseEnter = () => setIsToolbarVisible(true);
    const handleMouseLeave = () => setIsToolbarVisible(false);

    const handleTouchStart = () => {
      longPressTimer.current = setTimeout(() => {
        setIsToolbarVisible(true);
      }, 500); // 500ms para un toque largo
    };

    const handleTouchEnd = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };

    const handleTouchMove = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };

    // --- Clases y Estilos ---
    const containerClasses = `flex w-full my-1 ${isUser ? "justify-end" : "justify-start"}`;
    const bubbleClasses = `rounded-xl px-4 py-2.5 max-w-xl shadow-md flex flex-col relative ${isUser ? "bg-blue-500 text-white rounded-br-none" : "bg-zinc-800 text-gray-100 rounded-bl-none"}`;
    const speaker = isUser ? "Tú" : "Bot";
    const speakerColor = isUser ? "text-blue-200" : "text-gray-300";

    return (
      <div
        className={containerClasses}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <div className={`${bubbleClasses} animate-message-in`}>
          {/* --- Barra de Herramientas Flotante --- */}
          {isToolbarVisible && !isEditing && (
            <div className="absolute -top-10 right-0 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 rounded-lg shadow-lg flex items-center gap-1 p-1 animate-message-fade">
              {message.text && (
                <button
                  onClick={handleCopy}
                  title={t("messages.copy")}
                  className="p-2 hover:bg-zinc-700 rounded"
                >
                  <CopyIcon />
                </button>
              )}
              {isUser && isLastUserMessage && (
                <button
                  onClick={handleEditClick}
                  title={t("messages.edit")}
                  className="p-2 hover:bg-zinc-700 rounded"
                >
                  <EditIcon />
                </button>
              )}
              {!isUser && isLastMessage && !isLoading && (
                <button
                  onClick={handleRegenerate}
                  title={t("messages.regenerate")}
                  className="p-2 hover:bg-zinc-700 rounded"
                >
                  <RegenerateIcon />
                </button>
              )}
              <button
                onClick={handleDelete}
                title={t("messages.delete")}
                className="p-2 hover:bg-zinc-700 rounded"
              >
                <DeleteIcon />
              </button>
            </div>
          )}

          <div className={`font-bold text-sm mb-1 ${speakerColor}`}>
            {speaker}
          </div>

          {message.fileInfo && (
            <div className="flex items-center gap-3 rounded-lg bg-black/20 p-2 my-1 border border-white/10">
              <FileIcon fileType={message.fileInfo.type} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-medium break-all text-white">
                  {message.fileInfo.name}
                </span>
                <span className="text-xs text-gray-400">
                  {(message.fileInfo.size / 1024).toFixed(2)} KB
                </span>
              </div>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={localEditText}
                onChange={(e) => setLocalEditText(e.target.value)}
                className="w-full bg-black/20 border border-blue-300 rounded-md p-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                rows={Math.max(2, localEditText.split("\n").length)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleEditSave}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
                <button
                  onClick={() => stopEditingMessage()}
                  className="px-3 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>{message.text && <FormattedMessage text={message.text} />}</>
          )}

          {message.imageUrl && (
            <div className="mt-2">
              <img
                src={`data:image/jpeg;base64,${message.imageUrl}`}
                alt="Generated by AI"
                className="rounded-lg w-full h-auto"
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default ChatMessage;
