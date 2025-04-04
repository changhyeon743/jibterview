'use client';
//@orchestra chat

import { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useWindowSize } from 'usehooks-ts';

import { ChatHeader } from '@/components/custom/chat-header';
import { PreviewMessage, ThinkingMessage } from '@/components/custom/message';
import { useScrollToBottom } from '@/components/custom/use-scroll-to-bottom';
import { Database } from '@/lib/supabase/types';
import { fetcher } from '@/lib/utils';

import { Block, UIBlock } from './block';
import { BlockStreamHandler } from './block-stream-handler';
import { MultimodalInput } from './multimodal-input';
import { Overview } from './overview';

// 클라이언트 사이드에서만 렌더링되도록 dynamic import 사용
const DynamicBlueprint = dynamic(
    () => import('@/components/blueprint/Blueprint3D'),
    { ssr: false }
);

type Vote = Database['public']['Tables']['votes']['Row'];

export function Chat({
                       id,
                       initialMessages,
                       selectedModelId,
                     }: {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
}) {
  const { mutate } = useSWRConfig();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    data: streamingData,
  } = useChat({
    body: { id, modelId: selectedModelId },
    initialMessages,
    onFinish: () => {
      mutate('/api/history');
    },
  });

  const { width: windowWidth = 1920, height: windowHeight = 1080 } =
      useWindowSize();

  const [block, setBlock] = useState<UIBlock>({
    documentId: 'init',
    content: '',
    title: '',
    status: 'idle',
    isVisible: false,
    boundingBox: {
      top: windowHeight / 4,
      left: windowWidth / 4,
      width: 250,
      height: 50,
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
      `/api/vote?chatId=${id}`,
      fetcher
  );

  const [messagesContainerRef, messagesEndRef] =
      useScrollToBottom<HTMLDivElement>();

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  return (
      <>
        <div className="flex flex-col md:flex-row min-w-0 h-dvh bg-background">

          {/* 오른쪽 평면도 영역 */}
          <div className="hidden md:block md:w-2/3 h-full border-l border-gray-200">
            <DynamicBlueprint />
          </div>
          {/* 왼쪽 채팅 영역 */}
          <div className="flex flex-col min-w-0 w-full md:w-1/3 h-full">
            <ChatHeader selectedModelId={selectedModelId} />
            <div
                ref={messagesContainerRef}
                className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
            >
              {messages.length === 0 && <Overview />}

              {messages.map((message, index) => (
                  <PreviewMessage
                      key={message.id}
                      chatId={id}
                      message={message}
                      block={block}
                      setBlock={setBlock}
                      isLoading={isLoading && messages.length - 1 === index}
                      vote={
                        votes
                            ? votes.find((vote) => vote.message_id === message.id)
                            : undefined
                      }
                  />
              ))}

              {isLoading &&
                  messages.length > 0 &&
                  messages[messages.length - 1].role === 'user' && (
                      <ThinkingMessage />
                  )}

              <div
                  ref={messagesEndRef}
                  className="shrink-0 min-w-[24px] min-h-[24px]"
              />
            </div>
            <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full">
              <MultimodalInput
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
              />
            </form>
          </div>

        </div>

        <AnimatePresence>
          {block && block.isVisible && (
              <Block
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  append={append}
                  block={block}
                  setBlock={setBlock}
                  messages={messages}
                  setMessages={setMessages}
                  votes={votes}
              />
          )}
        </AnimatePresence>

        <BlockStreamHandler streamingData={streamingData} setBlock={setBlock} />
      </>
  );
}
