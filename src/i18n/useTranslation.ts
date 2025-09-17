import { useTranslation as useI18nTranslation, UseTranslationOptions } from "react-i18next";
import { useMemo, useCallback } from "react";
import {
  changeLanguage as changeI18nLanguage,
  getCurrentLanguage,
  getAvailableLanguages,
  formatRelativeTime as formatRelative,
  formatNumber as formatNum,
  formatDate as formatDateUtil,
  formatFileSize as formatFileSizeUtil
} from "./config";

// Tipos de traducción disponibles
export type TranslationNamespace = "common";

// Tipo para las claves de traducción con autocompletado
export type TranslationKey =
  | "app.title"
  | "app.description"
  | "sidebar.newChat"
  | "sidebar.history"
  | "sidebar.conversations"
  | "sidebar.noConversations"
  | "sidebar.startFirstConversation"
  | "sidebar.generatingSummary"
  | "chatInput.placeholder"
  | "chatInput.placeholderWithFile"
  | "chatInput.attachFile"
  | "chatInput.sendMessage"
  | "chatInput.removeAttachment"
  | "chatInput.attached"
  | "messages.bot"
  | "messages.typing"
  | "messages.regenerate"
  | "messages.edit"
  | "messages.delete"
  | "messages.copy"
  | "personalities.flash.name"
  | "personalities.flash.description"
  | "personalities.flash.welcomeMessage"
  | "personalities.developer.name"
  | "personalities.developer.description"
  | "personalities.developer.welcomeMessage"
  | "menu.rename"
  | "menu.delete"
  | "menu.download"
  | "menu.changePersonality"
  | "menu.toggleSearch"
  | "menu.toggleFullscreen"
  | "menu.settings"
  | "states.loading"
  | "states.searching"
  | "states.processing"
  | "states.generating"
  | "states.analyzing"
  | "states.uploading"
  | "states.connecting"
  | "states.disconnected"
  | "states.reconnecting"
  | "tools.internetSearch"
  | "tools.getCurrentTime"
  | "tools.searchingFor"
  | "tools.searchResults"
  | "tools.noResultsFound"
  | "errors.general"
  | "errors.networkError"
  | "errors.apiKeyMissing"
  | "errors.apiKeyInvalid"
  | "errors.quotaExceeded"
  | "errors.fileUploadError"
  | "errors.fileTooBig"
  | "errors.fileTypeNotSupported"
  | "errors.conversationNotFound"
  | "errors.messageTooLong"
  | "errors.cannotDeleteLastConversation"
  | "errors.summaryGenerationFailed"
  | "success.messageRegenerating"
  | "success.messageCopied"
  | "success.conversationRenamed"
  | "success.conversationDeleted"
  | "success.conversationDownloaded"
  | "success.fileUploaded"
  | "success.settingsSaved"
  | "success.newConversationCreated"
  | "success.personalityChanged"
  | "success.summaryGenerated"
  | "success.searchEnabled"
  | "success.searchDisabled"
  | "success.fullscreenEnabled"
  | "success.fullscreenDisabled"
  | "actions.send"
  | "actions.cancel"
  | "actions.confirm"
  | "actions.save"
  | "actions.delete"
  | "actions.rename"
  | "actions.download"
  | "actions.upload"
  | "actions.copy"
  | "actions.edit"
  | "actions.close"
  | "actions.back"
  | "actions.next"
  | "actions.previous"
  | "actions.retry"
  | "actions.refresh"
  | "confirmations.deleteConversation"
  | "confirmations.deleteMessage"
  | "confirmations.clearAllConversations"
  | "confirmations.resetSettings"
  | "file.selectFile"
  | "file.dropFileHere"
  | "file.supportedFormats"
  | "file.maxFileSize"
  | "file.processing"
  | "file.analyzing"
  | "file.ready"
  | "accessibility.openSidebar"
  | "accessibility.closeSidebar"
  | "accessibility.scrollToBottom"
  | "accessibility.focusInput"
  | "accessibility.openMenu"
  | "accessibility.closeMenu"
  | "accessibility.selectPersonality"
  | "time.now"
  | "time.minuteAgo"
  | "time.minutesAgo"
  | "time.hourAgo"
  | "time.hoursAgo"
  | "time.dayAgo"
  | "time.daysAgo"
  | "time.weekAgo"
  | "time.weeksAgo"
  | "time.monthAgo"
  | "time.monthsAgo"
  | "time.yearAgo"
  | "time.yearsAgo"
  | "search.placeholder"
  | "search.noResults"
  | "search.resultsFound"
  | "search.searchInProgress"
  | "search.clearSearch"
  | "settings.language"
  | "settings.theme"
  | "settings.notifications"
  | "settings.privacy"
  | "settings.about"
  | "settings.version"
  | "settings.clearData"
  | "settings.exportData"
  | "settings.importData"
  | "features.dualPersonality"
  | "features.multimodalAnalysis"
  | "features.realTimeResponses"
  | "features.conversationMemory"
  | "features.internetSearch"
  | "features.fileAnalysis"
  | "features.codeGeneration"
  | "features.languageSupport";

// Opciones extendidas para el hook
export interface UseTranslationExtendedOptions extends UseTranslationOptions {
  // Namespace 
  namespace?: TranslationNamespace;
  // mostrar las claves cuando faltan traducciones
  showKeys?: boolean;
}

// hook extendido
export interface UseTranslationResult {
  // Función de traducción principal
  t: (key: TranslationKey, options?: any) => string;
  // Función de traducción con namespace
  tn: (namespace: TranslationNamespace, key: string, options?: any) => string;
  // Idioma actual
  language: string;
  // Idiomas disponibles
  availableLanguages: Array<{ code: string; name: string; nativeName: string }>;
  // Función para cambiar idioma
  changeLanguage: (language: string) => Promise<boolean>;
  // Estado de carga
  isLoading: boolean;
  // Si el idioma está listo
  ready: boolean;
  // Helpers de formateo
  formatters: {
    relativeTime: (date: Date | string | number) => string;
    number: (value: number) => string;
    date: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
    fileSize: (bytes: number) => string;
    currency: (amount: number, currency?: string) => string;
    percentage: (value: number) => string;
  };
  // Helpers específicos del chatbot
  chatHelpers: {
    getPersonalityName: (personality: "flash" | "developer") => string;
    getPersonalityWelcome: (personality: "flash" | "developer") => string;
    getErrorMessage: (errorType: string) => string;
    getSuccessMessage: (successType: string) => string;
    getStateMessage: (state: string) => string;
  };
  // Helpers de tiempo
  timeHelpers: {
    formatConversationTime: (timestamp: number) => string;
    formatMessageTime: (timestamp: number) => string;
    getTimeAgo: (timestamp: number) => string;
  };
  // Helpers de validación
  validationHelpers: {
    isRTL: boolean;
    isValidLanguage: (lang: string) => boolean;
    getTextDirection: () => "ltr" | "rtl";
  };
}

// Hook principal de traducción extendido
export const useTranslation = (
  options: UseTranslationExtendedOptions = {}
): UseTranslationResult => {
  const { namespace = "common", showKeys = false, ...i18nOptions } = options;

  const { t: originalT, i18n, ready } = useI18nTranslation(namespace, i18nOptions);

  // Función de traducción mejorada
  const t = useCallback((key: TranslationKey, options?: any): string => {
    try {
      const result = originalT(key, options);

      // Si está en desarrollo y showKeys está habilitado, mostrar la clave si falta la traducción
      if (showKeys && import.meta.env.MODE === "development" && result === key) {
        return `[${key}]`;
      }

      return result;
    } catch (error) {
      console.warn(`Translation error for key "${key}":`, error);
      return showKeys ? `[${key}]` : key;
    }
  }, [originalT, showKeys]);

  // Función de traducción con namespace
  const tn = useCallback((ns: TranslationNamespace, key: string, options?: any): string => {
    try {
      return originalT(`${ns}:${key}`, options);
    } catch (error) {
      console.warn(`Translation error for "${ns}:${key}":`, error);
      return showKeys ? `[${ns}:${key}]` : key;
    }
  }, [originalT, showKeys]);

  // Idioma actual
  const language = getCurrentLanguage();

  // Idiomas disponibles
  const availableLanguages = useMemo(() => getAvailableLanguages(), []);

  // Función para cambiar idioma
  const changeLanguage = useCallback(async (newLanguage: string): Promise<boolean> => {
    return changeI18nLanguage(newLanguage);
  }, []);

  // Helpers de formateo
  const formatters = useMemo(() => ({
    relativeTime: (date: Date | string | number) => formatRelative(date),
    number: (value: number) => formatNum(value),
    date: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      formatDateUtil(date, options),
    fileSize: (bytes: number) => formatFileSizeUtil(bytes),
    currency: (amount: number, currency = "USD") =>
      new Intl.NumberFormat(language, {
        style: "currency",
        currency
      }).format(amount),
    percentage: (value: number) =>
      new Intl.NumberFormat(language, {
        style: "percent",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      }).format(value / 100),
  }), [language]);

  // Helpers específicos del chatbot
  const chatHelpers = useMemo(() => ({
    getPersonalityName: (personality: "flash" | "developer") =>
      t(`personalities.${personality}.name` as TranslationKey),
    getPersonalityWelcome: (personality: "flash" | "developer") =>
      t(`personalities.${personality}.welcomeMessage` as TranslationKey),
    getErrorMessage: (errorType: string) =>
      t(`errors.${errorType}` as TranslationKey) || t("errors.general"),
    getSuccessMessage: (successType: string) =>
      t(`success.${successType}` as TranslationKey),
    getStateMessage: (state: string) =>
      t(`states.${state}` as TranslationKey),
  }), [t]);

  // Helpers de tiempo
  const timeHelpers = useMemo(() => ({
    formatConversationTime: (timestamp: number) =>
      formatDateUtil(timestamp, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
    formatMessageTime: (timestamp: number) =>
      formatDateUtil(timestamp, {
        hour: "2-digit",
        minute: "2-digit"
      }),
    getTimeAgo: (timestamp: number) => formatRelative(new Date(timestamp)),
  }), []);

  // Helpers de validación
  const validationHelpers = useMemo(() => ({
    isRTL: ["ar", "he", "fa", "ur"].includes(language),
    isValidLanguage: (lang: string) =>
      availableLanguages.some(l => l.code === lang),
    getTextDirection: (): "ltr" | "rtl" =>
      ["ar", "he", "fa", "ur"].includes(language) ? "rtl" : "ltr",
  }), [language, availableLanguages]);

  return {
    t,
    tn,
    language,
    availableLanguages,
    changeLanguage,
    isLoading: !ready,
    ready,
    formatters,
    chatHelpers,
    timeHelpers,
    validationHelpers,
  };
};

// Hook específico para componentes del chatbot
export const useChatTranslation = () => {
  const translation = useTranslation({ namespace: "common" });

  return {
    ...translation,
    // Funciones específicas para el chat
    getPlaceholder: (hasFile: boolean) =>
      hasFile ? translation.t("chatInput.placeholderWithFile") : translation.t("chatInput.placeholder"),
    getAttachmentText: (fileName: string) =>
      translation.t("chatInput.attached", { fileName }),
    getToolMessage: (tool: string, query?: string) => {
      const toolName = translation.t(`tools.${tool}` as TranslationKey);
      return query ? translation.t("tools.searchingFor", { query }) : toolName;
    },
  };
};

// Hook para manejo de errores con traducción
export const useErrorTranslation = () => {
  const { chatHelpers } = useTranslation();

  return useCallback((error: Error | string): string => {
    if (typeof error === "string") {
      return chatHelpers.getErrorMessage(error);
    }

    // Mapear errores comunes
    const message = error.message.toLowerCase();
    if (message.includes("api key")) return chatHelpers.getErrorMessage("apiKeyInvalid");
    if (message.includes("quota")) return chatHelpers.getErrorMessage("quotaExceeded");
    if (message.includes("network")) return chatHelpers.getErrorMessage("networkError");
    if (message.includes("file")) return chatHelpers.getErrorMessage("fileUploadError");

    return chatHelpers.getErrorMessage("general");
  }, [chatHelpers]);
};

// Export por defecto
export default useTranslation;
