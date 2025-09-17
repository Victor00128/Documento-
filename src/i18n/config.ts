import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Importar recursos de traducción
import esCommon from "../../locales/es/common.json";
import enCommon from "../../locales/en/common.json";

// Definir recursos de traducción
const resources = {
  es: {
    common: esCommon,
  },
  en: {
    common: enCommon,
  },
};

// Configuración de i18next
i18n
  // Detectar idioma del usuario
  .use(LanguageDetector)
  // Pasar la instancia de i18n a react-i18next
  .use(initReactI18next)
  // Inicializar i18next
  .init({
    // Recursos de traducción
    resources,

    // Namespace por defecto
    defaultNS: "common",

    // Idiomas soportados
    supportedLngs: ["es", "en"],

    // Idioma de fallback si no se detecta o no está soportado
    fallbackLng: "es",

    // Configuración de detección de idioma
    detection: {
      // Orden de detección de idioma
      order: [
        "querystring",
        "cookie",
        "localStorage",
        "sessionStorage",
        "navigator",
        "htmlTag",
        "path",
        "subdomain",
      ],

      // Claves para buscar el idioma en diferentes lugares
      lookupQuerystring: "lng",
      lookupCookie: "vortex-ai-language",
      lookupLocalStorage: "vortex-ai-language",
      lookupSessionStorage: "vortex-ai-language",

      // Cache del idioma seleccionado
      caches: ["localStorage", "cookie"],

      // Excluir ciertos idiomas del cache
      excludeCacheFor: ["cimode"],

      // Tiempo de vida del cache (dias)
      cookieMinutes: 60 * 24 * 30, // 30 días
    },

    // Configuración de interpolación
    interpolation: {
      // React 
      escapeValue: false,

      // Formato de las variables
      formatSeparator: ",",

      // Funciones de formato personalizadas
      format: (value, format, lng) => {
        // Formato para números
        if (format === "number") {
          return new Intl.NumberFormat(lng).format(value);
        }

        // Formato para fechas
        if (format === "date") {
          return new Intl.DateTimeFormat(lng).format(value);
        }

        // Formato para fechas completas
        if (format === "datetime") {
          return new Intl.DateTimeFormat(lng, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(value);
        }

        // Formato para fechas relativas
        if (format === "relative") {
          const now = new Date();
          const date = new Date(value);
          const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

          if (diffInSeconds < 60) return i18n.t("time.now");
          if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return minutes === 1
              ? i18n.t("time.minuteAgo")
              : i18n.t("time.minutesAgo", { count: minutes });
          }
          if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return hours === 1
              ? i18n.t("time.hourAgo")
              : i18n.t("time.hoursAgo", { count: hours });
          }

          const days = Math.floor(diffInSeconds / 86400);
          if (days < 7) {
            return days === 1
              ? i18n.t("time.dayAgo")
              : i18n.t("time.daysAgo", { count: days });
          }

          const weeks = Math.floor(days / 7);
          if (weeks < 4) {
            return weeks === 1
              ? i18n.t("time.weekAgo")
              : i18n.t("time.weeksAgo", { count: weeks });
          }

          const months = Math.floor(days / 30);
          if (months < 12) {
            return months === 1
              ? i18n.t("time.monthAgo")
              : i18n.t("time.monthsAgo", { count: months });
          }

          const years = Math.floor(days / 365);
          return years === 1
            ? i18n.t("time.yearAgo")
            : i18n.t("time.yearsAgo", { count: years });
        }

        return value;
      },
    },

    // Configuración de desarrollo
    debug: import.meta.env.MODE === "development",

    // Configuración de carga de recursos
    load: "languageOnly",

    // Configuración de pluralización
    pluralSeparator: "_",
    contextSeparator: "_",

    // Configuración de missing keys
    saveMissing: import.meta.env.MODE === "development",
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      if (import.meta.env.MODE === "development") {
        console.warn(`Missing translation key: ${ns}:${key} for language: ${lng}`);
      }
    },

    // Configuración de parseo
    parseMissingKeyHandler: (key) => key,

    // Configuración de espacios de nombres
    ns: ["common"],

    // Configuración de separadores
    keySeparator: ".",
    nsSeparator: ":",

    // Configuración de react-i18next
    react: {
      // Usar Suspense para carga asíncrona
      useSuspense: false,

      // Detectar cambios en el idioma
      bindI18n: "languageChanged",

      // Detectar cambios en el store
      bindI18nStore: "",

      // Configuración de traducción por defecto
      defaultTransParent: "div",

      // Configuración de atributos trans
      transEmptyNodeValue: "",
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ["br", "strong", "i"],

      // Escapar HTML en valores
      unescape: true,
    },
  });

// Función helper para cambiar idioma
export const changeLanguage = async (language: string) => {
  try {
    await i18n.changeLanguage(language);

    // Actualizar el atributo lang del HTML
    document.documentElement.lang = language;

    // Guardar en localStorage para persistencia
    localStorage.setItem("vortex-ai-language", language);

    return true;
  } catch (error) {
    console.error("Error changing language:", error);
    return false;
  }
};

// Función helper para obtener el idioma actual
export const getCurrentLanguage = () => i18n.language || i18n.options.fallbackLng;

// Función helper para obtener idiomas disponibles
export const getAvailableLanguages = () => [
  { code: "es", name: "Español", nativeName: "Español" },
  { code: "en", name: "English", nativeName: "English" },
];

// Función helper para detectar si el idioma está cargado
export const isLanguageLoaded = (language: string) => {
  return i18n.hasResourceBundle(language, "common");
};

// Función helper para formatear fechas relativas
export const formatRelativeTime = (date: Date | string | number) => {
  return i18n.t("time.now", {
    value: date,
    formatParams: {
      value: { format: "relative" }
    }
  });
};

// Función helper para formatear números
export const formatNumber = (value: number) => {
  return new Intl.NumberFormat(getCurrentLanguage()).format(value);
};

// Función helper para formatear fechas
export const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return new Intl.DateTimeFormat(getCurrentLanguage(), options || defaultOptions).format(new Date(date));
};

// Función helper para formatear tamaños de archivo
export const formatFileSize = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${formatNumber(Math.round(size * 100) / 100)} ${units[unitIndex]}`;
};

// Eventos de i18next para desarrollo
if (import.meta.env.MODE === "development") {
  i18n.on("languageChanged", (lng) => {
    console.log(`Language changed to: ${lng}`);
  });

  i18n.on("loaded", (loaded) => {
    console.log("i18n resources loaded:", loaded);
  });

  i18n.on("failedLoading", (lng, ns, msg) => {
    console.error(`Failed loading ${lng}/${ns}: ${msg}`);
  });
}

export default i18n;
