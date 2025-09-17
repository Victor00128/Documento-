import React, { useState, useRef, useEffect } from "react";
import { Conversation } from "../types";
import ConversationMenu from "./ConversationMenu";
import { useChatStore } from "../store/chatStore";
import { useTranslation } from "../src/i18n/useTranslation";
import "../styles/animations.css";

const Sidebar: React.FC = () => {
  const { t, formatters } = useTranslation();
  const {
    conversations,
    activeConversationId,
    isLoading,
    isSidebarOpen,
    isGeneratingSummary,
    selectConversation,
    newConversation,
    deleteConversation,
    downloadConversation,
    renameConversation,
  } = useChatStore();

  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleRenameStart = (convo: Conversation) => {
    setRenamingId(convo.id);
    setTempTitle(convo.title);
    setMenuOpenForId(null);
  };

  const handleRenameConfirm = () => {
    if (renamingId && tempTitle.trim()) {
      renameConversation(renamingId, tempTitle);
    }
    setRenamingId(null);
  };

  const handleMenuToggle = (e: React.MouseEvent, convoId: string) => {
    e.stopPropagation();
    setMenuOpenForId((prevId) => (prevId === convoId ? null : convoId));
  };

  return (
    <aside
      className={`
      fixed inset-y-0 left-0 z-30 w-64
      bg-[#1C1C1C] border-r border-zinc-800
      transform transition-all duration-300 ease-in-out
      md:relative md:translate-x-0 md:flex-shrink-0
      ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
    `}
    >
      <div className="w-full h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex-shrink-0">
          <button
            onClick={() => newConversation()}
            disabled={isLoading || isGeneratingSummary}
            className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white font-semibold rounded-lg px-4 py-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all duration-200 disabled:bg-zinc-700 disabled:cursor-not-allowed button-hover-lift micro-bounce ripple-effect focus-ring"
          >
            {isLoading || isGeneratingSummary ? (
              <div className="w-5 h-5 animate-spin">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 transition-transform"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            )}
            {isGeneratingSummary
              ? t("sidebar.generatingSummary")
              : t("sidebar.newChat")}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 smooth-scroll">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t("sidebar.history")}
            </span>
            <span className="text-xs text-gray-600 bg-zinc-800 px-2 py-1 rounded-full">
              {formatters.number(Object.keys(conversations).length)}{" "}
              {t("sidebar.conversations")}
            </span>
          </div>
          <ul className="space-y-1">
            {Object.values(conversations)
              .sort((a, b) => b.lastModified - a.lastModified)
              .map((convo, index) => (
                <li
                  key={convo.id}
                  className="relative group/item fade-in-up"
                  style={{ 
                    animationDelay: `${index * 0.05}s`,
                    zIndex: menuOpenForId === convo.id ? 50 : 'auto'
                  }}
                >
                  {renamingId === convo.id ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={tempTitle}
                      onChange={(e) => setTempTitle(e.target.value)}
                      onBlur={handleRenameConfirm}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleRenameConfirm()
                      }
                      className="w-full bg-zinc-800 border border-blue-500 rounded-md text-sm font-medium px-2 py-2 text-white outline-none focus-ring transition-all animate-message-in z-10 relative"
                    />
                  ) : (
                    <div
                      className={`flex items-center rounded-md transition-all duration-200 ${activeConversationId === convo.id ? "bg-zinc-800 shadow-lg" : "hover:bg-zinc-800/50"}`}
                    >
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          selectConversation(convo.id);
                        }}
                        className="flex-1 flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:text-white transition-all duration-200 focus-ring micro-bounce"
                      >
                        <div
                          className={`flex-shrink-0 w-2 h-2 rounded-full transition-all duration-200 ${
                            activeConversationId === convo.id
                              ? "bg-blue-400 shadow-sm shadow-blue-400/50"
                              : "bg-blue-500"
                          }`}
                        ></div>
                        <span className="truncate hover-brightness transition-all">
                          {convo.title}
                        </span>
                        {convo.summary && (
                          <div
                            className="flex-shrink-0 w-1.5 h-1.5 bg-green-400 rounded-full opacity-60"
                            title="Resumen disponible"
                          ></div>
                        )}
                      </a>
                      <div className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-all duration-200 relative">
                        <button
                          onClick={(e) => handleMenuToggle(e, convo.id)}
                          className="p-1 text-gray-400 hover:text-white transition-all duration-200 focus-ring micro-bounce hover-scale relative z-10"
                          aria-label="Opciones de conversación"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-4 h-4 transition-transform hover:rotate-90"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                  {menuOpenForId === convo.id && (
                    <div className="animate-message-in">
                      <ConversationMenu
                        onRename={() => handleRenameStart(convo)}
                        onDelete={() => {
                          deleteConversation(convo.id);
                          setMenuOpenForId(null);
                        }}
                        onDownload={() => {
                          downloadConversation(convo.id);
                          setMenuOpenForId(null);
                        }}
                        onClose={() => setMenuOpenForId(null)}
                      />
                    </div>
                  )}
                </li>
              ))}
            {Object.keys(conversations).length === 0 && (
              <li className="text-center text-gray-500 text-sm py-8 fade-in">
                <div className="mb-2">💬</div>
                <p>{t("sidebar.noConversations")}</p>
                <p className="text-xs mt-1">
                  {t("sidebar.startFirstConversation")}
                </p>
              </li>
            )}
          </ul>
        </nav>

        {/* Indicador de resumen activo */}
        {isGeneratingSummary && (
          <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-700 text-xs text-gray-400 flex items-center gap-2 animate-message-in">
            <div className="w-3 h-3 animate-spin">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-3 h-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
            </div>
            {t("sidebar.generatingSummary")}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
