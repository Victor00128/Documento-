import React, { useEffect, useRef } from "react";
import "katex/dist/katex.min.css";
import "./styles/animations.css";
import { useChatStore } from "./store/chatStore";
import Header from "./components/Header";
import MessageList from "./components/MessageList";
import ChatInput from "./components/ChatInput";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";

const App: React.FC = () => {
  const {
    conversations,
    isSidebarOpen,
    toast,
    newConversation,
    setError,
    setFullscreen,
    hideToast,
    // drag & drop
    isDragging,
    setIsDragging,
    setFileForUpload,
  } = useChatStore();

  const dragCounter = useRef(0);

  useEffect(() => {
    if (Object.keys(conversations).length === 0) {
      newConversation();
    }
  }, [conversations, newConversation]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [setFullscreen]);

  // Drag & Drop global
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current += 1;
      setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current -= 1;
      if (dragCounter.current <= 0) {
        setIsDragging(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        setFileForUpload(files[0]);
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [setIsDragging, setFileForUpload]);

  return (
    <div className="flex h-screen bg-[#121212] text-white font-sans overflow-hidden transition-all">
      <Sidebar />
      {isSidebarOpen && (
        <div
          onClick={() => useChatStore.getState().setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-20 md:hidden modal-backdrop backdrop-blur-sm"
          aria-hidden="true"
        />
      )}
      <div className="flex flex-col flex-1 relative min-w-0 transition-all">
        <Header />
        {/* ...error/toast/mensajes */}
        <MessageList />
        <ChatInput />
        {toast && (
          <div className="toast-enter">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={hideToast}
            />
          </div>
        )}

        {isDragging && (
          <div className="fixed inset-0 z-[70] pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto border-2 border-dashed border-blue-400/80 bg-zinc-900/90 text-white px-6 py-8 rounded-2xl shadow-2xl text-center">
                <div className="text-3xl mb-2">Suelta el archivo aquí</div>
                <div className="text-sm text-gray-300">Se adjuntará al siguiente mensaje</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;