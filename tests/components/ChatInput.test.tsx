import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatInput from "../../components/ChatInput";
import { useChatStore } from "../../store/chatStore";

// Mock del store
vi.mock("../../store/chatStore", () => ({
  useChatStore: vi.fn(),
}));

// Mock de las animaciones CSS
vi.mock("../../styles/animations.css", () => ({}));

const mockStore = {
  sendMessage: vi.fn(),
  isLoading: false,
  conversations: {},
  activeConversationId: "test-conversation-id",
};

const mockConversation = {
  id: "test-conversation-id",
  title: "Test Conversation",
  messages: [],
  lastModified: Date.now(),
  personality: "flash" as const,
};

describe("ChatInput", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.conversations = {
      "test-conversation-id": mockConversation,
    };
    (useChatStore as any).mockReturnValue(mockStore);

    // Mock focus methods
    vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("should render the chat input form", () => {
      render(<ChatInput />);

      expect(
        screen.getByPlaceholderText("Escribe tu mensaje..."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /enviar mensaje/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /adjuntar archivo/i }),
      ).toBeInTheDocument();
    });

    it("should show attach button for non-image personality types", () => {
      render(<ChatInput />);
      expect(
        screen.getByRole("button", { name: /adjuntar archivo/i }),
      ).toBeInTheDocument();
    });

    it("should hide attach button for image personality type", () => {
      const imagePersonalityConversation = {
        ...mockConversation,
        personality: "image" as const,
      };

      const storeWithImagePersonality = {
        ...mockStore,
        conversations: {
          "test-conversation-id": imagePersonalityConversation,
        },
      };

      (useChatStore as any).mockReturnValue(storeWithImagePersonality);

      render(<ChatInput />);
      expect(
        screen.queryByRole("button", { name: /adjuntar archivo/i }),
      ).not.toBeInTheDocument();
    });

    it("should show loading spinner when isLoading is true", () => {
      const loadingStore = {
        ...mockStore,
        isLoading: true,
      };

      (useChatStore as any).mockReturnValue(loadingStore);

      render(<ChatInput />);

      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });
      expect(submitButton).toBeDisabled();
      // El spinner está dentro del botón
      expect(submitButton.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Text Input", () => {
    it("should update input value when typing", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText(
        "Escribe tu mensaje...",
      ) as HTMLTextAreaElement;
      await user.type(input, "Hello, world!");

      expect(input.value).toBe("Hello, world!");
    });

    it("should auto-resize textarea when content changes", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText(
        "Escribe tu mensaje...",
      ) as HTMLTextAreaElement;

      //Simulacro de la propiedad scrollHeight
      Object.defineProperty(input, "scrollHeight", {
        configurable: true,
        value: 100,
      });

      await user.type(
        input,
        "This is a long message that should cause the textarea to resize",
      );

      // config de la altura para que coincida con scrollHeight
      expect(input.style.height).toBe("100px");
    });

    it("should clear input after sending message", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText(
        "Escribe tu mensaje...",
      ) as HTMLTextAreaElement;
      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });

      await user.type(input, "Test message");
      await user.click(submitButton);

      expect(mockStore.sendMessage).toHaveBeenCalledWith(
        "Test message",
        undefined,
      );
      expect(input.value).toBe("");
    });
  });

  describe("Keyboard Shortcuts", () => {
    it("should send message when Enter is pressed without Shift", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText("Escribe tu mensaje...");
      await user.type(input, "Test message");
      await user.keyboard("{Enter}");

      expect(mockStore.sendMessage).toHaveBeenCalledWith(
        "Test message",
        undefined,
      );
    });

    it("should not send message when Shift+Enter is pressed", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText("Escribe tu mensaje...");
      await user.type(input, "Test message");
      await user.keyboard("{Shift>}{Enter}{/Shift}");

      expect(mockStore.sendMessage).not.toHaveBeenCalled();
    });

    it("should add new line when Shift+Enter is pressed", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText(
        "Escribe tu mensaje...",
      ) as HTMLTextAreaElement;
      await user.type(input, "First line");
      await user.keyboard("{Shift>}{Enter}{/Shift}");
      await user.type(input, "Second line");

      expect(input.value).toContain("\n");
    });
  });

  describe("File Handling", () => {
    it("should show file attachment when file is selected", async () => {
      render(<ChatInput />);

      const fileInput = screen
        .getByRole("button", { name: /adjuntar archivo/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      await user.upload(fileInput, file);

      expect(screen.getByText(/Adjunto: test\.txt/)).toBeInTheDocument();
    });

    it("should remove file attachment when remove button is clicked", async () => {
      render(<ChatInput />);

      // Agregar Archivo primero
      const fileInput = screen
        .getByRole("button", { name: /adjuntar archivo/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      await user.upload(fileInput, file);
      expect(screen.getByText(/Adjunto: test\.txt/)).toBeInTheDocument();

      // retirar
      const removeButton = screen.getByRole("button", {
        name: /eliminar archivo adjunto/i,
      });
      await user.click(removeButton);

      expect(screen.queryByText(/Adjunto: test\.txt/)).not.toBeInTheDocument();
    });

    it("should change placeholder text when file is attached", async () => {
      render(<ChatInput />);

      const fileInput = screen
        .getByRole("button", { name: /adjuntar archivo/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      await user.upload(fileInput, file);

      expect(
        screen.getByPlaceholderText("Pregunta sobre el archivo adjunto..."),
      ).toBeInTheDocument();
    });

    it("should accept only image and PDF files", () => {
      render(<ChatInput />);

      const fileInput = screen
        .getByRole("button", { name: /adjuntar archivo/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput.accept).toBe("image/*,application/pdf");
    });

    it("should send message with file attachment", async () => {
      render(<ChatInput />);

      const fileInput = screen
        .getByRole("button", { name: /adjuntar archivo/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      await user.upload(fileInput, file);

      const input = screen.getByPlaceholderText(
        "Pregunta sobre el archivo adjunto...",
      );
      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });

      await user.type(input, "What's in this file?");
      await user.click(submitButton);

      expect(mockStore.sendMessage).toHaveBeenCalledWith(
        "What's in this file?",
        file,
      );
    });
  });

  describe("Submit Button States", () => {
    it("should disable submit button when input is empty and no file", () => {
      render(<ChatInput />);

      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when input has text", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText("Escribe tu mensaje...");
      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });

      await user.type(input, "Hello");

      expect(submitButton).not.toBeDisabled();
    });

    it("should enable submit button when file is attached", async () => {
      render(<ChatInput />);

      const fileInput = screen
        .getByRole("button", { name: /adjuntar archivo/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      await user.upload(fileInput, file);

      expect(submitButton).not.toBeDisabled();
    });

    it("should disable all inputs when loading", () => {
      const loadingStore = {
        ...mockStore,
        isLoading: true,
      };

      (useChatStore as any).mockReturnValue(loadingStore);

      render(<ChatInput />);

      const input = screen.getByPlaceholderText("Escribe tu mensaje...");
      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });
      const attachButton = screen.getByRole("button", {
        name: /adjuntar archivo/i,
      });

      expect(input).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(attachButton).toBeDisabled();
    });
  });

  describe("Focus Management", () => {
    it("should focus textarea when component mounts with active conversation", async () => {
      const focusMock = vi.fn();
      HTMLTextAreaElement.prototype.focus = focusMock;

      render(<ChatInput />);

      // El enfoque para llamar después de un pequeño retraso
      await waitFor(
        () => {
          expect(focusMock).toHaveBeenCalled();
        },
        { timeout: 200 },
      );
    });

    it("should return focus to textarea after file selection", async () => {
      const focusMock = vi.fn();
      HTMLTextAreaElement.prototype.focus = focusMock;

      render(<ChatInput />);

      const fileInput = screen
        .getByRole("button", { name: /adjuntar archivo/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      focusMock.mockClear(); // Clear initial focus calls

      await user.upload(fileInput, file);

      // foco para llamar después de la selección del archivo
      await waitFor(
        () => {
          expect(focusMock).toHaveBeenCalled();
        },
        { timeout: 200 },
      );
    });

    it("should return focus to textarea after removing file", async () => {
      const focusMock = vi.fn();
      HTMLTextAreaElement.prototype.focus = focusMock;

      render(<ChatInput />);

      // Agregar archivo
      const fileInput = screen
        .getByRole("button", { name: /adjuntar archivo/i })
        .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["test content"], "test.txt", {
        type: "text/plain",
      });

      await user.upload(fileInput, file);

      focusMock.mockClear();

      // Remover el archivo
      const removeButton = screen.getByRole("button", {
        name: /eliminar archivo adjunto/i,
      });
      await user.click(removeButton);

      // llamada al foco después de eliminar el archivo
      await waitFor(
        () => {
          expect(focusMock).toHaveBeenCalled();
        },
        { timeout: 200 },
      );
    });
  });

  describe("Edge Cases", () => {
    it("should not send empty messages", async () => {
      render(<ChatInput />);

      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });

      // hacer clic en enviar con la entrada vacía
      await user.click(submitButton);

      expect(mockStore.sendMessage).not.toHaveBeenCalled();
    });

    it("should not send whitespace-only messages", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText("Escribe tu mensaje...");
      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });

      await user.type(input, "   \n\t   ");
      await user.click(submitButton);

      expect(mockStore.sendMessage).not.toHaveBeenCalled();
    });

    it("should trim message before sending", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText("Escribe tu mensaje...");
      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });

      await user.type(input, "  Hello world  ");
      await user.click(submitButton);

      expect(mockStore.sendMessage).toHaveBeenCalledWith(
        "Hello world",
        undefined,
      );
    });

    it("should handle missing active conversation gracefully", () => {
      const storeWithoutConversation = {
        ...mockStore,
        activeConversationId: null,
        conversations: {},
      };

      (useChatStore as any).mockReturnValue(storeWithoutConversation);

      expect(() => render(<ChatInput />)).not.toThrow();
    });

    it("should reset textarea height after sending message", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText(
        "Escribe tu mensaje...",
      ) as HTMLTextAreaElement;
      const submitButton = screen.getByRole("button", {
        name: /enviar mensaje/i,
      });

      // Set some height first
      input.style.height = "100px";

      await user.type(input, "Test message");
      await user.click(submitButton);

      expect(input.style.height).toBe("auto");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<ChatInput />);

      expect(
        screen.getByRole("button", { name: /adjuntar archivo/i }),
      ).toHaveAttribute("aria-label", "Adjuntar archivo");
      expect(
        screen.getByRole("button", { name: /enviar mensaje/i }),
      ).toHaveAttribute("aria-label", "Enviar mensaje");
    });

    it("should show focus indicators", async () => {
      render(<ChatInput />);

      const input = screen.getByPlaceholderText("Escribe tu mensaje...");

      await user.tab(); // This should focus the input

      expect(input).toHaveFocus();
    });
  });
});
