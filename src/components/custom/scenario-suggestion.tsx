'use client';
//@orchestra chat

import { motion } from 'framer-motion';
import React from 'react';

import { Button } from '@/components/ui/button';

interface ScenarioAction {
    title: string;
    label: string;
    action: string;
}

interface ScenarioSuggestionsProps {
    onSelectScenario: (scenario: string) => void;
}

// Suggested scenarios data
const suggestedActions: ScenarioAction[] = [
    {
        title: '방 중심의 1인 남성',
        label: '작은 거실, 방 2개 이상',
        action: '저는 성인 남성 1명으로 혼자 거주합니다. 방에서 대부분의 시간을 보내기 때문에 방이 거실보다 넓었으면 좋겠고, 방은 최소 2개 이상 필요해요. 부엌은 작아도 괜찮고, 짐이 많지 않아 창고나 발코니는 없어도 됩니다.'
    },
    {
        title: '거실 선호 1인 남성',
        label: '게임 중심의 거실, 발코니 필요',
        action: '저는 혼자 살며 게임을 주로 거실에서 합니다. 그래서 거실이 방보다 넓었으면 좋겠고, 방은 2개 이상이면 좋아요. 발코니에서 식물을 키우고 싶어서 꼭 있었으면 좋겠고, 짐은 많지 않아 창고는 필요 없습니다.'
    },
    {
        title: '거실 활동 중심 1인 남성',
        label: '넓은 거실, 발코니로 빨래',
        action: '저는 1인 가구이고 게임과 여가를 주로 거실에서 즐깁니다. 거실이 방보다 넓었으면 좋겠고, 방은 2개 이상 필요합니다. 발코니에서 빨래를 하고 싶고, 창고는 필요 없어요. 부엌은 작아도 괜찮습니다.'
    },
    {
        title: '2인 부부 with 취미 공간',
        label: '큰 거실, 창고/발코니 필요',
        action: '성인 남녀 2명이 함께 거주합니다. 저희는 게임이나 TV 시청을 위해 거실이 넓었으면 하고, 짐이 많아서 창고가 꼭 필요해요. 발코니에서는 식물도 키우고 싶어요. 방은 2개 이상 필요하고, 부엌은 작아도 괜찮습니다.'
    },
    {
        title: '수납 중심의 2인 가구',
        label: '균형 잡힌 공간, 창고 2개 이상',
        action: '저희는 2인 가구이며 방과 거실을 비슷하게 사용합니다. 수납할 짐이 많아 창고는 2개 이상 꼭 필요하고, 발코니도 있었으면 좋겠어요. 드레스룸이 있으면 더 좋고, 부엌은 작아도 됩니다.'
    },
    {
        title: '거실 큰 신혼부부',
        label: '넓은 거실, 창고/발코니 꼭 필요',
        action: '저희는 맞벌이 신혼부부입니다. 주로 거실에서 여가를 보내기 때문에 거실이 방보다 컸으면 좋겠어요. 방은 2개 이상 필요하고, 짐이 많아 창고도 2개 이상 필요해요. 발코니에서 식물도 키우고 싶습니다.'
    },
    {
        title: '3인 가족 (아이 포함)',
        label: '균형 잡힌 구조, 발코니 포함',
        action: '저희는 성인 2명과 아이 1명이 함께 살고 있습니다. 방은 3개 이상 필요하고, 거실과 방은 균형 있게 사용합니다. 수납을 위해 창고가 하나는 꼭 필요하고, 발코니에서 식물 키우고 빨래도 합니다.'
    },
    {
        title: '4인 가족 (아이 2명)',
        label: '넓은 주방과 드레스룸, 방 4개',
        action: '성인 2명과 아이 2명이 함께 살고 있어 방은 4개 이상 필요합니다. 주방은 요리를 자주 해먹기 때문에 넓었으면 좋겠고, 발코니와 창고도 꼭 필요해요. 드레스룸도 있으면 좋겠습니다.'
    },
    {
        title: '3세대 대가족',
        label: '넓은 공간, 드레스룸 포함',
        action: '노부부, 성인부부, 아이 1명이 함께 거주합니다. 방은 4개 이상 필요하고, 드레스룸과 발코니는 필수입니다. 주방은 요리를 자주 하기에 넓은 편이 좋고, 짐이 많지 않아 창고는 없어도 괜찮습니다.'
    }
];

export function ScenarioSuggestions({ onSelectScenario }: ScenarioSuggestionsProps) {
    return (
        <div className="grid sm:grid-cols-2 gap-2 w-full">
            {suggestedActions.map((suggestedAction, index) => (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.05 * index }}
                    key={index}
                    className={index > 1 ? 'hidden sm:block' : 'block'}
                >
                    <Button
                        variant="ghost"
                        onClick={() => onSelectScenario(suggestedAction.action)}
                        className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
                    >
                        <span className="font-medium">{suggestedAction.title}</span>
                        <span className="text-muted-foreground">{suggestedAction.label}</span>
                    </Button>
                </motion.div>
            ))}
        </div>
    );
}
