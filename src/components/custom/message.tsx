'use client';
//@orchestra chat

import { Message } from 'ai';
import cx from 'classnames';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

import { useBlueprint } from '@/contexts/BlueprintContext';
import { Vote } from '@/lib/supabase/types';

import { BlueprintREPL } from './blueprint-repl';
import { SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';

export const PreviewMessage = ({
                                   chatId,
                                   message,
                                   block,
                                   setBlock,
                                   vote,
                                   isLoading,
                               }: {
    chatId: string;
    message: Message;
    block: any; // UIBlock 타입
    setBlock: any; // Dispatch 함수
    vote: Vote | undefined;
    isLoading: boolean;
}) => {
    // 간소화된 BlueprintContext 사용
    const { blueprint } = useBlueprint();

    // blueprint 코드 관련 로직 간소화 - 코드 실행만 집중
    useEffect(() => {
        if (message.role !== 'assistant') return;

        // 도구 호출에서 코드 찾기
        if (message.toolInvocations?.length > 0) {
            const blueprintAction = message.toolInvocations.find(
                tool => tool.toolName === 'blueprintAction' && tool.state === 'result'
            );

            if (blueprintAction?.result?.code) {
                // 코드는 찾지만 Context에 저장하지 않음
                // 실행이 필요한 경우 BlueprintREPL에서 직접 처리
            }
        }
    }, [message]);

    return (
        <motion.div
            className="w-full mx-auto max-w-3xl px-4 group/message"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            data-role={message.role}
        >
            <div
                className={cx(
                    'group-data-[role=user]/message:bg-primary group-data-[role=user]/message:text-primary-foreground flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl'
                )}
            >
                {message.role === 'assistant' && (
                    <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
                        <SparklesIcon size={14} />
                    </div>
                )}

                <div className="flex flex-col gap-2 w-full">
                    <div className="prose dark:prose-invert group-data-[role=user]/message:text-primary-foreground">
                        <Markdown>{message.content}</Markdown>
                    </div>

                    {message.toolInvocations && message.toolInvocations.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {message.toolInvocations.map((toolInvocation) => {
                                const { toolName, toolCallId, state, args } = toolInvocation;

                                if (state === 'result') {
                                    const { result } = toolInvocation;

                                    return (
                                        <div key={toolCallId}>
                                            {toolName === 'blueprintAction' ? (
                                                <div className="my-2">
                                                    {result.code && (
                                                        <BlueprintREPL
                                                            code={result.code.replace(/```javascript\s+([\s\S]+?)\s+```/g, '$1').trim()}
                                                            onExecutionComplete={() => {
                                                                // 실행 완료 후 로직
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div
                                            key={toolCallId}
                                            className={cx({
                                                skeleton: ['blueprintAction'].includes(toolName),
                                            })}
                                        >
                                            {toolName === 'blueprintAction' ? (
                                                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md animate-pulse">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        평면도 작업 중...
                                                    </p>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    )}

                    {message.experimental_attachments && (
                        <div className="flex flex-row gap-2">
                            {message.experimental_attachments.map((attachment) => (
                                <PreviewAttachment
                                    key={attachment.url}
                                    attachment={attachment}
                                />
                            ))}
                        </div>
                    )}

                    <MessageActions
                        key={`action-${message.id}`}
                        chatId={chatId}
                        message={message}
                        vote={vote}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </motion.div>
    );
};

// ThinkingMessage 컴포넌트는 변경 없음
export const ThinkingMessage = () => {
    const role = 'assistant';

    return (
        <motion.div
            className="w-full mx-auto max-w-3xl px-4 group/message"
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
            data-role={role}
        >
            <div
                className={cx(
                    'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
                    {
                        'group-data-[role=user]/message:bg-muted': true,
                    }
                )}
            >
                <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
                    <SparklesIcon size={14} />
                </div>

                <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col gap-4 text-muted-foreground">
                        Thinking...
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
