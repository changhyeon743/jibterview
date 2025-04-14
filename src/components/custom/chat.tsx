'use client';
//@orchestra chat

import {Attachment, Message} from 'ai';
import {useChat} from 'ai/react';
import {AnimatePresence, motion} from 'framer-motion';
import dynamic from "next/dynamic";
import {useState, useEffect} from 'react';
import useSWR, {useSWRConfig} from 'swr';
import {useWindowSize} from 'usehooks-ts';

import {BlueprintInput} from "@/components/custom/blueprint-input";
import {ChatHeader} from "@/components/custom/chat-header";
import {PreviewMessage, ThinkingMessage} from '@/components/custom/message';
import {useScrollToBottom} from '@/components/custom/use-scroll-to-bottom';
import {useBlueprint} from '@/contexts/BlueprintContext';
import {Database} from '@/lib/supabase/types';
import {cn, fetcher} from '@/lib/utils';

import {Block, UIBlock} from './block';
import {BlockStreamHandler} from './block-stream-handler';
import {MultimodalInput} from './multimodal-input';
import {Overview} from './overview';

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
    const {width: windowWidth = 1920, height: windowHeight = 1080} = useWindowSize();

    // 간소화된 BlueprintContext 사용
    const {blueprint, blueprintData, saveBlueprintData} = useBlueprint();

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
        data: streamingData,
    } = useChat({
        body: {id, modelId: selectedModelId},
        initialMessages,
        onFinish: () => mutate('/api/history'),
    });
    // UI 상태 관리
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
    const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
    const [attachments, setAttachments] = useState<Array<Attachment>>([]);

    // 투표 데이터 가져오기
    const {data: votes} = useSWR<Array<Vote>>(`/api/vote?chatId=${id}`, fetcher);

    return (
        <div className='h-dvh flex flex-col'>

            <ChatHeader selectedModelId={selectedModelId}/>

            <div className="flex flex-row h-[94svh]">

                {/* 채팅 영역 */}
                <div
                    className={cn(
                        "flex flex-col min-w-0 h-full bg-background border-r transition-all duration-500",
                        messages.length > 0 ? "w-1/3" : "w-full"
                    )}
                >
                    {/* 헤더 등 기존 코드 유지 */}
                    <div
                        ref={messagesContainerRef}
                        className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 px-4"
                    >
                        {messages.length === 0 && <Overview/>}

                        {messages.map((message, index) => (
                            <PreviewMessage
                                key={message.id}
                                chatId={id}
                                message={message}
                                block={block}
                                setBlock={setBlock}
                                isLoading={isLoading && messages.length - 1 === index}
                                vote={votes?.find((vote) => vote.message_id === message.id)}
                            />
                        ))}

                        {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                            <ThinkingMessage/>
                        )}

                        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]"/>
                    </div>

                    <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full" onSubmit={handleSubmit}>
                        {/*<MultimodalInput*/}
                        <BlueprintInput
                            chatId={id}
                            input={input}
                            setInput={setInput}
                            handleSubmit={handleSubmit}
                            isLoading={isLoading}
                            stop={stop}
                            // attachments={attachments}
                            // setAttachments={setAttachments}
                            messages={messages}
                            setMessages={setMessages}
                            append={append}
                        />
                    </form>
                </div>


                {/* Blueprint 영역 */}
                <AnimatePresence>
                    {messages.length > 0 && (
                        <motion.div
                            key="blueprint" // key 필수
                            className="w-2/3 h-full"
                            initial={{x: '100%', opacity: 0}}
                            animate={{x: 0, opacity: 1}}
                            exit={{x: '100%', opacity: 0}}
                            transition={{type: 'spring', stiffness: 100, damping: 20}}
                        >
                            <DynamicBlueprint initialData={blueprintData}/>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Block UI */}
                {/*<AnimatePresence>*/}
                {/*    {block.isVisible && (*/}
                {/*        <Block*/}
                {/*            chatId={id}*/}
                {/*            input={input}*/}
                {/*            setInput={setInput}*/}
                {/*            handleSubmit={handleSubmit}*/}
                {/*            isLoading={isLoading}*/}
                {/*            stop={stop}*/}
                {/*            attachments={attachments}*/}
                {/*            setAttachments={setAttachments}*/}
                {/*            append={append}*/}
                {/*            block={block}*/}
                {/*            setBlock={setBlock}*/}
                {/*            messages={messages}*/}
                {/*            setMessages={setMessages}*/}
                {/*            votes={votes}*/}
                {/*        />*/}
                {/*    )}*/}
                {/*</AnimatePresence>*/}

                {/*<BlockStreamHandler streamingData={streamingData} setBlock={setBlock} />*/}
            </div>
        </div>
    );
}
