import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../src/i18n/useTranslation";
import "../styles/animations.css";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "en", name: "English", nativeName: "English", flag: "🇺🇸" },
];

interface LanguageSelectorProps {
  className?: string;
  variant?: "dropdown" | "toggle" | "compact";
  showFlags?: boolean;
  showNativeNames?: boolean;
  onLanguageChange?: (language: string) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = "",
  variant = "dropdown",
  showFlags = true,
  showNativeNames = true,
  onLanguageChange,
}) => {
  const { t, language, changeLanguage, isLoading } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find((lang) => lang.code === language) || languages[0];

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cerrar el dropdown con Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === language || isChanging) return;

    setIsChanging(true);
    setIsOpen(false);

    try {
      const success = await changeLanguage(newLanguage);
      if (success) {
        onLanguageChange?.(newLanguage);
      }
    } catch (error) {
      console.error("Error changing language:", error);
    } finally {
      setIsChanging(false);
    }
  };

  const toggleDropdown = () => {
    if (!isChanging) {
      setIsOpen(!isOpen);
    }
  };

  // Renderizado para el variante toggle (solo dos idiomas)
  if (variant === "toggle") {
    const otherLanguage = languages.find((lang) => lang.code !== language) || languages[1];

    return (
      <button
        onClick={() => handleLanguageChange(otherLanguage.code)}
        disabled={isChanging || isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
          text-white text-sm font-medium transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-ring button-hover-lift micro-bounce
          ${className}
        `}
        title={t("settings.language")}
        aria-label={`Change language to ${otherLanguage.nativeName}`}
      >
        {isChanging ? (
          <div className="w-4 h-4 animate-spin">
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
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </div>
        ) : (
          <>
            {showFlags && <span className="text-base">{otherLanguage.flag}</span>}
            <span>{showNativeNames ? otherLanguage.nativeName : otherLanguage.code.toUpperCase()}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 transition-transform"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </>
        )}
      </button>
    );
  }

  // Renderizado para el variante compact
  if (variant === "compact") {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          disabled={isChanging || isLoading}
          className={`
            flex items-center gap-1 px-2 py-1 rounded
            bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
            text-white text-xs font-medium transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            focus-ring micro-bounce
          `}
          title={t("settings.language")}
          aria-label="Select language"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {showFlags && <span className="text-sm">{currentLanguage.flag}</span>}
          <span>{currentLanguage.code.toUpperCase()}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 py-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 min-w-[120px] animate-message-in">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={lang.code === language || isChanging}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 text-left text-xs
                  hover:bg-zinc-700 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${lang.code === language ? "bg-zinc-700 text-blue-400" : "text-white"}
                `}
                role="option"
                aria-selected={lang.code === language}
              >
                {showFlags && <span className="text-sm">{lang.flag}</span>}
                <span>{showNativeNames ? lang.nativeName : lang.name}</span>
                {lang.code === language && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-3 h-3 ml-auto text-blue-400"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Renderizado por defecto (dropdown)
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        disabled={isChanging || isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          bg-zinc-800 hover:bg-zinc-700 border border-zinc-700
          text-white text-sm font-medium transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-ring button-hover-lift micro-bounce
          min-w-[140px]
        `}
        title={t("settings.language")}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {isChanging ? (
          <div className="w-4 h-4 animate-spin">
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
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </div>
        ) : (
          showFlags && <span className="text-base">{currentLanguage.flag}</span>
        )}

        <span className="flex-1 text-left">
          {showNativeNames ? currentLanguage.nativeName : currentLanguage.name}
        </span>

        {!isChanging && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-50 min-w-[180px] animate-message-in">
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-zinc-700 mb-1">
            {t("settings.language")}
          </div>

          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={lang.code === language || isChanging}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-left text-sm
                hover:bg-zinc-700 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${lang.code === language ? "bg-zinc-700 text-blue-400" : "text-white"}
              `}
              role="option"
              aria-selected={lang.code === language}
            >
              {showFlags && <span className="text-lg">{lang.flag}</span>}

              <div className="flex-1">
                <div className="font-medium">
                  {showNativeNames ? lang.nativeName : lang.name}
                </div>
                <div className="text-xs text-gray-400">
                  {showNativeNames ? lang.name : lang.nativeName}
                </div>
              </div>

              {lang.code === language && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4 text-blue-400"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}

          <div className="border-t border-zinc-700 mt-1 pt-1">
            <div className="px-3 py-1 text-xs text-gray-500">
              {t("features.languageSupport")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
