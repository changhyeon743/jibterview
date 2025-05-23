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
    block: any | undefined; // UIBlock 타입
    setBlock: any | undefined; // Dispatch 함수
    vote: Vote | undefined;
    isLoading: boolean;
}) => {

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
                    {/*{message.toolInvocations && message.toolInvocations.length > 0 && (*/}
                    {/*    <div className="flex flex-col gap-4">*/}
                    {/*        {message.toolInvocations.map((toolInvocation) => {*/}
                    {/*            const { toolName, toolCallId, state, args } = toolInvocation;*/}

                    {/*            if (state === 'result') {*/}
                    {/*                const { result } = toolInvocation;*/}

                    {/*                return (*/}
                    {/*                    <div key={toolCallId}>*/}
                    {/*                        {toolName === 'blueprintAction' && result.interpretation ? (*/}
                    {/*                            <div className="my-4">*/}
                    {/*                                {result.interpretation.split('\n').map((line: string, i: number) => (*/}
                    {/*                                    <p key={i} className={i > 0 ? 'mt-2' : ''}>*/}
                    {/*                                        {line}*/}
                    {/*                                    </p>*/}
                    {/*                                ))}*/}


                    {/*                                /!* 선택적으로 분석 데이터 표시 *!/*/}
                    {/*                                <details className="mt-3">*/}
                    {/*                                    <summary className="cursor-pointer text-xs text-muted-foreground">*/}
                    {/*                                        상세 분석 데이터 보기*/}
                    {/*                                    </summary>*/}
                    {/*                                    {result.code && (*/}
                    {/*                                        <BlueprintREPL*/}
                    {/*                                            code={result.code.replace(/```javascript\s+([\s\S]+?)\s+```/g, '$1').trim()}*/}
                    {/*                                            analysisData={result.data}*/}
                    {/*                                            onExecutionComplete={() => {}}*/}
                    {/*                                        />*/}
                    {/*                                    )}*/}
                    {/*                                </details>*/}
                    {/*                            </div>*/}
                    {/*                        ) : null}*/}
                    {/*                    </div>*/}
                    {/*                );*/}
                    {/*            } else {*/}
                    {/*                return (*/}
                    {/*                    <div*/}
                    {/*                        key={toolCallId}*/}
                    {/*                        className={cx({*/}
                    {/*                            skeleton: ['blueprintAction'].includes(toolName),*/}
                    {/*                        })}*/}
                    {/*                    >*/}
                    {/*                        {toolName === 'blueprintAction' ? (*/}
                    {/*                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md animate-pulse">*/}
                    {/*                                <p className="text-sm text-gray-500 dark:text-gray-400">*/}
                    {/*                                    공간 분석 중...*/}
                    {/*                                </p>*/}
                    {/*                            </div>*/}
                    {/*                        ) : null}*/}
                    {/*                    </div>*/}
                    {/*                );*/}
                    {/*            }*/}
                    {/*        })}*/}
                    {/*    </div>*/}
                    {/*)}*/}


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
