import React from "react";
import { useTranslation } from "../src/i18n/useTranslation";
import "../styles/animations.css";

const TypingIndicator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center space-x-1">
      <div className="flex items-center space-x-1 typing-indicator">
        <div className="w-2 h-2 bg-blue-400 rounded-full dot transition-colors"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full dot transition-colors"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full dot transition-colors"></div>
      </div>
      <span className="text-xs text-gray-400 ml-2 animate-pulse">
        {t("messages.typing")}
      </span>
    </div>
  );
};

export default TypingIndicator;
