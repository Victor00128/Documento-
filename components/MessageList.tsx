import React, { useEffect, useRef } from "react";
import { Sender } from "../types";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import ToolIndicator from "./ToolIndicator";
import ImageContextIndicator from "./ImageContextIndicator";
import VirtualizedMessageList from "./VirtualizedMessageList";
import { useChatStore } from "../store/chatStore";
import "../styles/animations.css";

const MessageList: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    conversations,
    activeConversationId,
    isLoading,
    isSearching,
    currentTool,
    toolQuery,
  } = useChatStore();

  const activeConversation = activeConversationId
    ? conversations[activeConversationId]
    : null;
  const messages = activeConversation?.messages || [];

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const lastMessage = messages[messages.length - 1];
      // Scroll instantly if the user sent the last message, otherwise scroll smoothly
      const behavior = lastMessage?.sender === Sender.User ? "auto" : "smooth";
      scrollToBottom(behavior);
    }, 0);

    return () => clearTimeout(timer);
  }, [messages.length, isLoading]); // Reruns when a new message is added or loading state changes

  const visibleMessages = messages.filter(
    (msg) => !(msg.sender === Sender.AI && msg.text === "" && isLoading),
  );

  const showIndicator =
    isLoading &&
    visibleMessages.length > 0 &&
    visibleMessages[visibleMessages.length - 1]?.sender === Sender.User;

  const isLastMessage = (messageId: string) => {
    const lastMessage = visibleMessages[visibleMessages.length - 1];
    return lastMessage?.id === messageId;
  };

  const isLastUserMessage = (messageId: string) => {
    const userMessages = visibleMessages.filter(
      (m) => m.sender === Sender.User,
    );
    const lastUserMessage = userMessages[userMessages.length - 1];
    return lastUserMessage?.id === messageId;
  };

  const shouldUseVirtualization = visibleMessages.length > 50;

  if (shouldUseVirtualization) {
    return <VirtualizedMessageList />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 smooth-scroll">
      {visibleMessages.map((msg) => (
        <div key={msg.id} className="animate-message-fade">
          <ChatMessage
            message={msg}
            isLastMessage={isLastMessage(msg.id)}
            isLastUserMessage={isLastUserMessage(msg.id)}
          />
        </div>
      ))}
      <ImageContextIndicator />
      {showIndicator && (
        <div className="flex w-full my-2 justify-start animate-message-in">
          <div className="rounded-xl px-4 py-2.5 max-w-xl shadow-md bg-zinc-800 text-gray-100 rounded-bl-none transition-all">
            <div className="font-bold text-sm mb-1 text-gray-300">Bot</div>
            {isSearching && currentTool ? (
              <ToolIndicator tool={currentTool} query={toolQuery} />
            ) : (
              <TypingIndicator />
            )}
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
