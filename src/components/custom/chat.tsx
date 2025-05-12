'use client';
//@orchestra chat

import {
    Attachment,
    Message
} from 'ai';
import {useChat} from 'ai/react';
import {AnimatePresence, motion} from 'framer-motion';
import dynamic from "next/dynamic";
import {useState} from 'react';
import useSWR, {useSWRConfig} from 'swr';

import {BlueprintInput} from "@/components/custom/blueprint-input";
import {ChatHeader} from "@/components/custom/chat-header";
import {PreviewMessage, ThinkingMessage} from '@/components/custom/message';
import {Overview} from "@/components/custom/overview";
import {useScrollToBottom} from '@/components/custom/use-scroll-to-bottom';
import {useBlueprint} from '@/contexts/BlueprintContext';
import {Database} from '@/lib/supabase/types';
import {cn, fetcher} from '@/lib/utils';

// 지연 로딩된 Blueprint3D 컴포넌트
const DynamicBlueprint = dynamic(() => import('@/components/blueprint/Blueprint3D'), {
    ssr: false,
    loading: () => <div className="size-full bg-gray-100 animate-pulse rounded-md"/>
});

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
    const {mutate} = useSWRConfig();

    // 간소화된 BlueprintContext 사용
    const {roomNetwork} = useBlueprint();

    // Chat 상태 관리
    const {
        messages,
        setMessages,
        handleSubmit,
        input,
        setInput,
        append,
        isLoading,
        stop,
    } = useChat({
        body: {id, modelId: selectedModelId, roomNetwork},
        initialMessages,
        onFinish: () => mutate('/api/history'),
    });

    const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();

    // 투표 데이터 가져오기
    const {data: votes} = useSWR<Array<Vote>>(`/api/vote?chatId=${id}`, fetcher);

    // 대화가 있는지 여부 확인
    const hasMessages = messages.length > 0;

    return (
        <div className='h-dvh flex flex-col'>
            <ChatHeader selectedModelId={selectedModelId}/>

            <div className="flex flex-row h-[94svh]">
                {/* 채팅 영역 */}
                <div
                    className={cn(
                        "flex flex-col min-w-0 h-full bg-background border-r transition-all duration-500",
                        "w-1/3"
                    )}
                >
                    <div
                        ref={messagesContainerRef}
                        className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 px-4"
                    >
                        {messages.map((message, index) => (
                            <PreviewMessage
                                key={message.id}
                                chatId={id}
                                message={message}
                                block={undefined}
                                setBlock={undefined}
                                isLoading={isLoading && messages.length - 1 === index}
                                vote={votes?.find((vote) => vote.message_id === message.id)}
                            />
                        ))}

                        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                            <ThinkingMessage/>
                        )}

                        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]"/>
                    </div>

                    <form
                        className="flex-1 px-4 bg-background pb-4 md:pb-6 gap-2 w-full"
                        onSubmit={handleSubmit}
                    >
                        <div className='outline rounded outline-[1px] outline-gray-400 p-4'>
                            {!hasMessages && <Overview />}

                            <BlueprintInput
                                chatId={id}
                                input={input}
                                setInput={setInput}
                                handleSubmit={handleSubmit}
                                isLoading={isLoading}
                                stop={stop}
                                messages={messages}
                                setMessages={setMessages}
                                append={append}
                            />
                        </div>

                    </form>
                </div>

                {/* Blueprint 영역 - 메시지가 있을 때만 표시 */}
                <div
                    className={cn(
                        "h-full transition-all duration-500",
                        "w-2/3"
                    )}
                >
                    <DynamicBlueprint/>
                </div>
            </div>
        </div>
    );
}
