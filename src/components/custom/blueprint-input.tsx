'use client';

import {
    ChatRequestOptions,
    CreateMessage,
    Message
} from 'ai';
import cx from 'classnames';
import {motion} from 'framer-motion';
import React, {
    useRef,
    useEffect,
    useCallback,
    useMemo,
    useState
} from 'react';
import {toast} from 'sonner';
import {useLocalStorage, useWindowSize} from 'usehooks-ts';

import {useBlueprint} from '@/contexts/BlueprintContext';
import {
    getSimplifiedRoomInfo,
    diffSimplifiedRoomInfo
} from '@/lib/blueprint/analysis';
import {sanitizeUIMessages} from '@/lib/utils';

import {ArrowUpIcon, StopIcon} from './icons';
import {Button} from '../ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '../ui/card';
import {Textarea} from '../ui/textarea';


const suggestedActions = [
    {
        title: '1인 대학생 집',
        label: '분리형 원룸, 개방감',
        action:
            '저는 학교 근처에서 자취하고 싶은 대학생입니다. 작은 거실과 방 1개가 있는 분리형 원룸 구조를 원해요. 부엌은 작아도 괜찮지만, 문을 열고 들어갔을 때 답답하지 않도록 개방감이 중요해요. 주로 밖에서 생활하고 집에서는 잠만 자지만, 방에 옷장과 침대, 책상은 꼭 있었으면 좋겠습니다.',
    },
    {
        title: '2인 맞벌이 부부',
        label: '거실은 넓게, 서재와 안방 분리',
        action:
            '저희는 맞벌이 부부 2명입니다. 한 사람은 재택근무를 해서 서재가 꼭 필요해요. 부부가 함께 사용하는 안방은 침대가 들어갈 만큼 넓으면 좋고, 거실은 게임과 영화를 자주 즐길 수 있도록 크게 만들어 주세요. 반면 부엌은 자주 사용하지 않아 작아도 괜찮습니다.',
    },
    {
        title: '2인 노부부의 집',
        label: '여유로운 거실과 넉넉한 부엌, 베란다 필수',
        action:
            '저희는 노부부 2명입니다. 보통 거실에서 함께 생활하기 때문에 거실을 넓게 쓰고 싶어요. 요리를 많이 하기 때문에 부엌도 넉넉했으면 좋겠습니다. 남편이 난초를 키워서 베란다가 꼭 있어야 하고, 현관문을 열고 들어갔을 때 환하고 탁 트인 개방감이 중요해요.',
    },
    {
        title: '3인 표준핵가족',
        label: '안방 1개, 자녀 방 1개, 넓은 거실과 부엌',
        action:
            '저희는 맞벌이 부부 2명과 초등학생 1명, 총 3명으로 구성된 가족이에요. 함께 시간을 보내는 거실이 넓었으면 하고, 아이가 사용할 방도 따로 필요합니다. 보통 요리를 자주 해서 부엌을 크게 두고 싶어요. 식물을 키우기 위해 베란다도 꼭 있었으면 좋겠습니다.',
    },
    {
        title: '4인 표준핵가족',
        label: '안방 1개, 아이들 놀 방 1개, 넓은 거실',
        action:
            '저희 가족은 맞벌이 부부 2명, 아이 2명으로 총 4명입니다. 가족 모두가 함께 모여 식사하거나 영화를 볼 수 있도록 거실을 넓게 만들고 싶어요. 아이들이 쓸 방을 따로 두어 장난감이나 2층 침대를 둘 수 있게 해주세요. 부엌은 요리를 많이 하므로 커야 하고, 베란다에서 식물도 키우고 싶습니다.',
    },
    {
        title: '5인 표준대가족',
        label: '방 3개 이상, 화장실 2개 이상, 거실·부엌 모두 넓게',
        action:
            '저희는 노부부 2명, 맞벌이 부부 2명, 아이 1명으로 총 5명이 한집에 살아요. 거실을 크게 만들어 온 가족이 식사나 모임을 즐길 수 있게 해주세요. 또 노부부가 요리를 자주 하니 부엌도 넉넉했으면 좋겠고, 베란다에서 빨래할 수 있도록 공간이 필요합니다. 방은 최소 3개, 화장실도 2개 이상이면 좋겠습니다.',
    },
    {
        title: '6인 표준대가족',
        label: '방 3개 이상, 화장실 2개 이상, 베란다 필수',
        action:
            '저희 가족은 노부부 2명, 맞벌이 부부 2명, 아이 2명으로 총 6명이에요. 보통 모두 거실에서 함께 식사하고 시간을 보내기 때문에 거실을 크게 만들고 싶습니다. 아이들과 부부가 사용하는 방은 출입문과 가까우면 좋겠고, 베란다도 꼭 필요해요. 방은 최소 3개 이상, 화장실도 2개 이상이 필요합니다.',
    },
];

export function BlueprintInput({
                                   chatId,
                                   input,
                                   setInput,
                                   isLoading,
                                   stop,
                                   messages,
                                   setMessages,
                                   append,
                                   handleSubmit,
                                   className
                               }: {
    chatId: string;
    input: string;
    setInput: (value: string) => void;
    isLoading: boolean;
    stop: () => void;
    messages: Array<Message>;
    setMessages: React.Dispatch<React.SetStateAction<Array<Message>>>;
    append: (
        message: Message | CreateMessage,
        chatRequestOptions?: ChatRequestOptions
    ) => Promise<string | null | undefined>;
    handleSubmit: (
        event?: { preventDefault?: () => void },
        chatRequestOptions?: ChatRequestOptions
    ) => void;
    className?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const {width} = useWindowSize();
    const {blueprintData, simplifiedRoomInfo, diff} = useBlueprint();
    const [localStorageInput, setLocalStorageInput] = useLocalStorage('input', '');

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
        }
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            const domValue = textareaRef.current.value;
            const finalValue = domValue || localStorageInput || '';
            setInput(finalValue);
        }
    }, [localStorageInput, setInput]);

    useEffect(() => {
        setLocalStorageInput(input);
    }, [input, setLocalStorageInput]);

    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(event.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
        }
    };

    const submitForm = useCallback(() => {
        window.history.replaceState({}, '', `/chat/${chatId}`);
        const current = getSimplifiedRoomInfo(blueprintData);
        const currentDiff = diff || [];
        handleSubmit(undefined, {body: {blueprint: current, diff: currentDiff}});
        setLocalStorageInput('');
        if (width && width > 768) {
            textareaRef.current?.focus();
        }
    }, [handleSubmit, blueprintData, width, chatId, diff, setLocalStorageInput]);

    return (
        <div className="relative w-full flex flex-col gap-4">
            {simplifiedRoomInfo && simplifiedRoomInfo.metrics && (
                <Card className="bg-muted/50">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">공간 요약 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 text-sm text-gray-900">
                        {Object.entries(simplifiedRoomInfo.metrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                                <span className="font-medium text-gray-700">{key}</span>
                                <span className="text-right">{String(value)}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {diff && diff.length > 0 && (
                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">최근 변경 사항</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-800 space-y-2">
                        {diff.map((d, i) => (
                            <div key={i}>
                                {d.type === 'added' && `➕ ${d.room.name} 추가됨 (${d.room.area}㎡)`}
                                {d.type === 'removed' && `➖ ${d.room.name} 제거됨`}
                                {d.type === 'modified' &&
                                    `✏️ ${d.before.name} → ${d.after.name} 변경됨 / ${d.before.area}㎡ → ${d.after.area}㎡`}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}


            {messages.length === 0 && (
                <div className="grid sm:grid-cols-2 gap-2 w-full">
                    {suggestedActions.map((suggestedAction, index) => (
                        <motion.div
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            exit={{opacity: 0, y: 20}}
                            transition={{delay: 0.05 * index}}
                            key={index}
                            className={index > 1 ? 'hidden sm:block' : 'block'}
                        >
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    window.history.replaceState({}, '', `/chat/${chatId}`);
                                    append(
                                        {role: 'user', content: suggestedAction.action},
                                        {
                                            body: {
                                                blueprint: simplifiedRoomInfo,
                                                diff: diff || []
                                            }
                                        }
                                    );
                                }}
                                className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
                            >
                                <span className="font-medium">{suggestedAction.title}</span>
                                <span className="text-muted-foreground">{suggestedAction.label}</span>
                            </Button>
                        </motion.div>
                    ))}
                </div>
            )}

            <Textarea
                ref={textareaRef}
                placeholder="메시지를 입력하세요..."
                value={input}
                onChange={handleInput}
                className={cx(
                    'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-xl text-base bg-muted',
                    className
                )}
                rows={3}
                autoFocus
                onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        if (isLoading) {
                            toast.error('모델의 응답을 기다려주세요!');
                        } else {
                            submitForm();
                        }
                    }
                }}
            />

            {isLoading ? (
                <Button
                    className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 border dark:border-zinc-600"
                    onClick={(e) => {
                        e.preventDefault();
                        stop();
                        setMessages((msgs) => sanitizeUIMessages(msgs));
                    }}
                >
                    <StopIcon size={14}/>
                </Button>
            ) : (
                <Button
                    className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 border dark:border-zinc-600"
                    onClick={(e) => {
                        e.preventDefault();
                        submitForm();
                    }}
                    disabled={input.length === 0}
                >
                    <ArrowUpIcon size={14}/>
                </Button>
            )}
        </div>
    );
}
