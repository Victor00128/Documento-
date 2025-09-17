import React from "react";
import { useChatStore } from "../store/chatStore";
import { useTranslation } from "../src/i18n/useTranslation";

const ImageContextIndicator: React.FC = () => {
  const { usingPreviousImage } = useChatStore();
  const { t } = useTranslation();

  if (!usingPreviousImage) return null;

  return (
    <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg animate-fade-in">
      <div className="flex items-center gap-2 text-blue-400 text-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 animate-pulse"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
        <span>{t("states.usingPreviousImage")}</span>
      </div>
    </div>
  );
};

export default ImageContextIndicator;
