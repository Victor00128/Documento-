import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

// Ejecutar limpieza después de cada test
afterEach(() => {
  cleanup();
});

// Configuraciones globales para el entorno de testing
beforeAll(() => {
  // Mock para matchMedia (no disponible en jsdom)
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock para ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock para IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock para requestFullscreen y exitFullscreen
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });

  Object.defineProperty(document, "exitFullscreen", {
    writable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });

  Object.defineProperty(document, "fullscreenElement", {
    writable: true,
    value: null,
  });

  // Mock para localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  vi.stubGlobal("localStorage", localStorageMock);

  // Mock para fetch API
  global.fetch = vi.fn();

  // Mock para URL.createObjectURL
  global.URL.createObjectURL = vi.fn().mockReturnValue("mock-url");
  global.URL.revokeObjectURL = vi.fn();

  // Mock para FileReader
  global.FileReader = vi.fn().mockImplementation(() => ({
    readAsDataURL: vi.fn(),
    onloadend: null,
    result: "data:text/plain;base64,dGVzdA==",
  }));

  // Suprimir console.error durante las pruebas para logs más limpios
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});

// Variables de entorno para testing
process.env.VITE_GEMINI_API_KEY = "test-gemini-key";
process.env.VITE_OPENAI_API_KEY = "test-openai-key";
