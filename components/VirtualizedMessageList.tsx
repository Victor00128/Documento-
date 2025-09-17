import React, { useEffect, useRef, useMemo, useCallback, useLayoutEffect, useState } from "react";
import { VariableSizeList as List } from "react-window";
import { Sender, ChatMessage as Message } from "../types";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import ToolIndicator from "./ToolIndicator";
import { useChatStore } from "../store/chatStore";

const ESTIMATED_LINE_HEIGHT = 20;
const BASE_MESSAGE_HEIGHT = 80;
const FILE_HEIGHT = 50;

const getItemHeight = (
  item: Message | { type: "indicator" },
  width: number,
): number => {
  if ("type" in item && item.type === "indicator") return 70;

  let height = BASE_MESSAGE_HEIGHT;
  const charWidth = 8;
  const charsPerLine = Math.max(1, Math.floor((width * 0.8) / charWidth));
  const numLines = Math.ceil(item.text.length / charsPerLine);
  height += numLines * ESTIMATED_LINE_HEIGHT;

  if (item.fileInfo) height += FILE_HEIGHT;

  return Math.max(100, height);
};

interface MessageItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: (Message | { type: "indicator" })[];
    isLastMessage: (messageId: string) => boolean;
    isLastUserMessage: (messageId: string) => boolean;
    currentTool: string | null;
    toolQuery: string | null;
    isSearching: boolean;
  };
}

const MessageItem: React.FC<MessageItemProps> = React.memo(
  ({ index, style, data }) => {
    const {
      items,
      isLastMessage,
      isLastUserMessage,
      currentTool,
      toolQuery,
      isSearching,
    } = data;
    const item = items[index];

    if ("type" in item && item.type === "indicator") {
      return (
        <div style={style}>
          <div className="px-6 py-2 flex w-full my-2 justify-start">
            <div className="rounded-xl px-4 py-2.5 max-w-xl shadow-md bg-zinc-800 text-gray-100 rounded-bl-none animate-message-in">
              <div className="font-bold text-sm mb-1 text-gray-300">Bot</div>
              {isSearching && currentTool ? (
                <ToolIndicator tool={currentTool} query={toolQuery || undefined} />
              ) : (
                <TypingIndicator />
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={style}>
        <div className="px-6 py-2">
          <ChatMessage
            key={item.id}
            message={item}
            isLastMessage={isLastMessage(item.id)}
            isLastUserMessage={isLastUserMessage(item.id)}
          />
        </div>
      </div>
    );
  },
);

const VirtualizedMessageList: React.FC = () => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeMap = useRef<Record<number, number>>({}).current;

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

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (msg) => !(msg.sender === Sender.AI && msg.text === "" && isLoading),
      ),
    [messages, isLoading],
  );

  const showIndicator =
    isLoading &&
    visibleMessages.length > 0 &&
    visibleMessages[visibleMessages.length - 1]?.sender === Sender.User;

  const items = useMemo(() => {
    const baseItems: (Message | { type: "indicator" })[] = visibleMessages;
    return showIndicator ? [...baseItems, { type: "indicator" }] : baseItems;
  }, [visibleMessages, showIndicator]);

  const isLastMessage = useCallback(
    (messageId: string) => {
      const lastMessage = visibleMessages[visibleMessages.length - 1];
      return lastMessage?.id === messageId;
    },
    [visibleMessages],
  );

  const isLastUserMessage = useCallback(
    (messageId: string) => {
      const userMessages = visibleMessages.filter((m) => m.sender === Sender.User);
      const lastUserMessage = userMessages[userMessages.length - 1];
      return lastUserMessage?.id === messageId;
    },
    [visibleMessages],
  );

  const itemData = useMemo(
    () => ({
      items,
      isLastMessage,
      isLastUserMessage,
      currentTool,
      toolQuery,
      isSearching,
    }),
    [items, isLastMessage, isLastUserMessage, currentTool, toolQuery, isSearching],
  );

  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const { offsetWidth, offsetHeight } = containerRef.current;
    setSize({ width: offsetWidth, height: offsetHeight });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      measure();
      // reset cache (medidas) tras cambiar tamaño
      Object.keys(sizeMap).forEach((k) => delete sizeMap[+k]);
      listRef.current?.resetAfterIndex(0, true);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    // auto-scroll al final cuando crecen los items
    if (!listRef.current || items.length === 0) return;
    // esperar al próximo frame para que la lista recalcule tamaños
    requestAnimationFrame(() => {
      listRef.current?.scrollToItem(items.length - 1, "end");
    });
  }, [items.length, size.width, size.height]);

  const getItemSize = useCallback(
    (index: number) => {
      const width = size.width || 800;
      if (!sizeMap[index]) {
        sizeMap[index] = getItemHeight(items[index], width);
      }
      return sizeMap[index];
    },
    [items, size.width],
  );

  // reset cache cuando cambia de conversación
  useEffect(() => {
    Object.keys(sizeMap).forEach((k) => delete sizeMap[+k]);
    listRef.current?.resetAfterIndex(0, true);
  }, [activeConversationId]);

  return (
    <div className="flex-1" ref={containerRef}>
      {size.height > 0 && size.width > 0 && (
        <List
          ref={listRef}
          height={size.height}
          width={size.width}
          itemCount={items.length}
          itemSize={getItemSize}
          itemData={itemData}
          className="scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent"
        >
          {MessageItem}
        </List>
      )}
    </div>
  );
};

export default VirtualizedMessageList;