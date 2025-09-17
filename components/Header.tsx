import React from "react";
import { AIPersonality, PERSONALITIES, PERSONALITY_ORDER } from "../types";
import { useChatStore } from "../store/chatStore";
import { useTranslation } from "../src/i18n/useTranslation";
import LanguageSelector from "./LanguageSelector";

const Header: React.FC = () => {
  const { t, chatHelpers } = useTranslation();
  const {
    conversations,
    activeConversationId,
    isLoading,
    isFullscreen,
    isSidebarOpen,
    isSearchEnabled,
    changePersonality,
    toggleSidebar,
    toggleFullscreen,
    toggleSearch,
  } = useChatStore();

  const currentPersonality = activeConversationId
    ? conversations[activeConversationId]?.personality || "flash"
    : "flash";

  return (
    <header className="bg-zinc-900/70 backdrop-blur-sm p-4 border-b border-zinc-800 shadow-lg sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-1 text-gray-400 hover:text-white transition-colors duration-200 md:hidden focus-ring micro-bounce"
            aria-label={t("accessibility.openSidebar")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
              />
            </svg>
          </button>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-8 h-8 text-blue-500 block drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]"
          >
            <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.134A.75.75 0 003 6.821v10.358c0 .32.19.601.478.712l8.254 3.321a.75.75 0 00.756 0l8.254-3.321a.75.75 0 00.478-.712V6.821a.75.75 0 00-.366-.687L12.378 1.602zM12 7.5a.75.75 0 01.75.75v3.19l2.47-1.426a.75.75 0 11.76 1.316l-3.22 1.86a.75.75 0 01-.76 0l-3.22-1.86a.75.75 0 11.76-1.316l2.47 1.426V8.25A.75.75 0 0112 7.5z" />
          </svg>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative">
            <select
              id="personality-select"
              value={currentPersonality}
              onChange={(e) =>
                changePersonality(e.target.value as AIPersonality)
              }
              disabled={isLoading}
              className="appearance-none bg-zinc-800 border border-zinc-800 rounded-md py-2 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base focus-ring"
              aria-label={t("accessibility.selectPersonality")}
            >
              {PERSONALITY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {chatHelpers.getPersonalityName(key)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          <button
            onClick={toggleSearch}
            disabled={isLoading}
            className={`p-2 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-ring micro-bounce ${
              isSearchEnabled
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-gray-400 hover:bg-zinc-700"
            }`}
            aria-label={t("menu.toggleSearch")}
            title={
              isSearchEnabled
                ? t("success.searchEnabled")
                : t("success.searchDisabled")
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S14.485 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.916 17.916 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
              />
            </svg>
          </button>
          <LanguageSelector variant="compact" className="hidden sm:block" />
          <button
            onClick={toggleFullscreen}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block focus-ring micro-bounce"
            aria-label={t("menu.toggleFullscreen")}
            title={
              isFullscreen
                ? t("success.fullscreenEnabled")
                : t("success.fullscreenDisabled")
            }
          >
            {isFullscreen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
