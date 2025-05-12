'use client';
//@orchestra chat

import {
    ChatRequestOptions,
    CreateMessage,
    Message
} from 'ai';
import cx from 'classnames';
import React, {
    useRef,
    useEffect,
    useCallback,
    useState
} from 'react';
import {toast} from 'sonner';
import {useLocalStorage} from 'usehooks-ts';

import {BlueprintAnalysisVisualizer} from '@/components/custom/blueprint-analysis-visualizer';
import {BlueprintSuggestion, BlueprintSuggestionModal} from '@/components/custom/blueprint-suggestion-modal';
import {QuantitativeFactor, QuantitativeFactorModal} from '@/components/custom/quantitative-factor-modal';
import {ScenarioSuggestions} from '@/components/custom/scenario-suggestion';
import {useBlueprint} from '@/contexts/BlueprintContext';

import {ArrowUpIcon, StopIcon} from './icons';
import {Button} from '../ui/button';
import {Textarea} from '../ui/textarea';

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
    const {roomNetwork, setBlueprintData} = useBlueprint();
    const [localStorageInput, setLocalStorageInput] = useLocalStorage('input', '');

    const [isQuantitativeFactorModalOpen, setIsQuantitativeFactorModalOpen] = useState(false);
    const [isBlueprintSuggestionModalOpen, setIsBlueprintSuggestionModalOpen] = useState(false);
    const [quantitativeFactors, setQuantitativeFactors] = useState<QuantitativeFactor | null>(null);
    const [userScenario, setUserScenario] = useState<string>('');

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
    //
    // // 입력값 기반으로 시나리오 저장 후 모달 오픈
    const submitForm = useCallback((scenarioText?: string) => {
        const scenario = scenarioText || input.trim();
        if (!scenario) {
            toast.error('메시지를 입력해주세요.');
            return;
        }

        setUserScenario(scenario);
        setIsQuantitativeFactorModalOpen(true);
    }, [input]);

    const handleFactorsGenerated = (factors: QuantitativeFactor) => {
        setQuantitativeFactors(factors);
        setIsQuantitativeFactorModalOpen(false);
        setIsBlueprintSuggestionModalOpen(true);
    };

    const handleBlueprintSelected = async (suggestion: BlueprintSuggestion) => {
        try {
            if (!suggestion.serializedData) {
                toast.error('도면 데이터를 불러올 수 없습니다.');
                return;
            }
            await setBlueprintData(suggestion.serializedData);
            window.history.replaceState({}, '', `/chat/${chatId}`);


            // GPT에 roomNetwork 및 quantitativeFactors 전달
            await append(
                {role: 'user', content: userScenario},
                {
                    body: {
                        roomNetwork
                    }
                }
            );

            setLocalStorageInput('');
            setInput('');
            if (textareaRef.current) {
                setTimeout(() => textareaRef.current?.focus(), 300);
            }
        } catch (error) {
            console.error('Blueprint 로드 오류:', error);
            toast.error('도면을 로드하는 중 오류가 발생했습니다.');
        }
    };

    // 채팅에 메시지가 없는 경우 (새 채팅)
    const isNewChat = messages.length === 0;

    // 채팅이 있고 도면도 있는 경우 (분석 가능)
    const showAnalysis = !isNewChat && roomNetwork;

    return (
        <div className="relative w-full flex flex-col gap-4">
            {/* 모달 */}
            <QuantitativeFactorModal
                isOpen={isQuantitativeFactorModalOpen}
                onClose={() => setIsQuantitativeFactorModalOpen(false)}
                userScenario={userScenario}
                onFactorsGenerated={handleFactorsGenerated}
            />
            {quantitativeFactors && (
                <BlueprintSuggestionModal
                    isOpen={isBlueprintSuggestionModalOpen}
                    onClose={() => setIsBlueprintSuggestionModalOpen(false)}
                    quantitativeFactors={quantitativeFactors}
                    onBlueprintSelected={handleBlueprintSelected}
                />
            )}

            {/* 공간 네트워크 시각화 및 요약 - 대화가 시작된 후에만 표시 */}
            {showAnalysis && (
                <BlueprintAnalysisVisualizer roomNetwork={roomNetwork}/>
            )}

            {/* 추천 시나리오 - 새 채팅일 때만 표시 */}
            {isNewChat && (
                <Button onClick={() => {
                    setIsQuantitativeFactorModalOpen(true);
                }} variant='outline'>
                    시작하기
                </Button>)}

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
                            return;
                        }

                        if (isNewChat) {
                            submitForm(); // 시나리오 + 모달 흐름
                        } else {
                            handleSubmit(undefined, {
                                body: {
                                    roomNetwork,
                                },
                            });
                        }
                    }
                }}
            />

            {/* 버튼 */}
            {isLoading ? (
                <Button
                    className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 border dark:border-zinc-600"
                    onClick={(e) => {
                        e.preventDefault();
                        stop();
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
