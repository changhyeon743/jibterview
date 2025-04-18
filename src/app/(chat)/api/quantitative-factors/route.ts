import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import {NextResponse} from "next/server";
import { z } from 'zod';

const QuantitativeFactorsSchema = z.object({
    totalArea: z.coerce.number().default(60),
    roomCount: z.coerce.number().default(1),
    livingRoomRatio: z.coerce.number().min(0).max(10).default(0.3),
    bathroomCount: z.coerce.number().default(1),
    storageCount: z.coerce.number().default(0),
    balconyCount: z.coerce.number().default(0),
    reason: z.string().max(1000), // ✨ 추천 이유 필드 추가
});

const fewShotExamples = [
    {
        input: "성인 남성 1명이 머무를 공간을 찾고 있습니다. 저는 최소 방 2개 이상의 공간을 원하고 있습니다. 주로 방에서 시간을 많이 보내기 때문에 방이 거실에 비해 컸으면 좋겠습니다. 주로 밖에서 해결하거나 배달을 시켜먹기 때문에 주방의 크기는 크지 않아도 상관없습니다. 짐이 별로 없어 창고는 필요가 없고, 발코니 또한 필요없습니다. 화장실 개수는 상관없습니다.",
        output: {
            totalArea: 35,
            roomCount: 2,
            livingRoomRatio: 0.603,
            bathroomCount: 1,
            storageCount: 0,
            balconyCount: 0,
            reason: "방 사용 비중이 높아 livingRoomRatio를 0.6으로 설정했으며, 1인 기준 최소 면적(33㎡)을 고려해 35㎡로 설정했습니다."
        }
    },
    {
        input: "성인 남성 1명이 머무를 공간을 찾고 있습니다. 저는 최소 방 2개 이상의 공간을 원하고 있습니다. 주로 게임을 하며 거실에서 시간을 많이 보내기 때문에 거실이 방에 비해 컸으면 좋겠습니다. 발코니에서 식물을 키우고 싶기 때문에 필요합니다. 창고는 필요 없습니다.",
        output: {
            totalArea: 39,
            roomCount: 2,
            livingRoomRatio: 1.25,
            bathroomCount: 1,
            storageCount: 0,
            balconyCount: 1,
            reason: "거실 사용 비중이 높아 거실:방 비율을 1.25로 설정하고, 발코니 1개 포함 요청을 반영했습니다."
        }
    },
    {
        input: "성인 남성 1명이 머무를 공간을 찾고 있습니다. 방은 2개 이상이었으면 하고, 게임을 하며 거실에서 시간을 많이 보냅니다. 발코니에서 빨래를 하기 위해 발코니가 필요하며, 창고는 필요하지 않습니다.",
        output: {
            totalArea: 49,
            roomCount: 2,
            livingRoomRatio: 1.62,
            bathroomCount: 1,
            storageCount: 0,
            balconyCount: 1,
            reason: "거실에서 보내는 시간이 많아 거실:방 비율을 1.62로 설정하고, 요청에 따라 발코니 1개를 반영했습니다."
        }
    },
    {
        input: "성인 남성 1명과 성인 여성 1명이 함께 거주합니다. 최소 방 2개 이상 원하며, 게임을 하며 거실에서 시간을 많이 보냅니다. 짐이 많아 창고가 반드시 필요하고, 발코니에서 식물을 키울 예정이라 발코니도 필요합니다.",
        output: {
            totalArea: 56.84,
            roomCount: 2,
            livingRoomRatio: 1.42,
            bathroomCount: 1,
            storageCount: 1,
            balconyCount: 1,
            reason: "2인 기준 권장 면적 이상으로 56.84㎡로 설정했으며, 거실 중심 사용과 수납 요구를 반영했습니다."
        }
    },
    {
        input: "성인 2명이 함께 거주하며, 방과 거실을 균형 있게 사용합니다. 짐이 많아 창고는 2개 이상 필요하고, 발코니도 필요합니다. 드레스룸이 있으면 좋겠습니다.",
        output: {
            totalArea: 70.68,
            roomCount: 2,
            livingRoomRatio: 0.89,
            bathroomCount: 1,
            storageCount: 2,
            balconyCount: 2,
            reason: "거실/방 균형적 사용으로 livingRoomRatio를 0.89로 설정했으며, 수납과 외부공간 요구를 반영했습니다."
        }
    },
    {
        input: "성인 2명이 거실을 많이 사용하는 스타일입니다. 방은 2개 이상, 창고 2개 이상, 발코니 필요합니다. 주방 크기는 상관없고, 화장실 개수는 상관없습니다.",
        output: {
            totalArea: 77,
            roomCount: 3,
            livingRoomRatio: 1.45,
            bathroomCount: 2,
            storageCount: 2,
            balconyCount: 1,
            reason: "거실 위주 생활 형태를 반영해 비율을 1.45로 설정하고, 수납 및 발코니 요구를 충실히 반영했습니다."
        }
    },
    {
        input: "성인 2명과 아이 1명이 함께 거주합니다. 방과 거실은 균형 있게 사용하며, 방은 3개 이상 필요합니다. 짐이 많아 창고가 꼭 필요하고, 발코니에서 식물 키우고 빨래 건조를 합니다.",
        output: {
            totalArea: 84,
            roomCount: 3,
            livingRoomRatio: 0.827,
            bathroomCount: 1,
            storageCount: 1,
            balconyCount: 1,
            reason: "가족형 거주를 반영해 방 3개로 설정하고, 중립적 비율로 거실:방은 0.827로 설정했습니다."
        }
    },
    {
        input: "성인 2명과 아이 2명이 함께 거주합니다. 방은 4개 이상, 짐이 많아 창고 필요, 발코니 필요합니다. 드레스룸은 반드시 있어야 합니다. 요리를 자주 해먹기 때문에 주방도 고려해야 합니다.",
        output: {
            totalArea: 103.52,
            roomCount: 4,
            livingRoomRatio: 1.0,
            bathroomCount: 2,
            storageCount: 2,
            balconyCount: 2,
            reason: "4인 가족 구조를 고려해 방 4개 이상, 수납공간과 외부공간 요구를 반영한 결과입니다."
        }
    },
    {
        input: "노부부 2명, 성인부부 2명, 아이 1명이 함께 거주합니다. 방은 4개 이상, 발코니는 꼭 필요하지만 창고는 필요하지 않습니다. 드레스룸이 필요하고, 주방은 넓은 편이 좋습니다.",
        output: {
            totalArea: 126,
            roomCount: 4,
            livingRoomRatio: 0.87,
            bathroomCount: 2,
            storageCount: 0,
            balconyCount: 3,
            reason: "대가족 구조와 드레스룸/주방/발코니 요구를 반영했으며, 공간 균형은 livingRoomRatio 0.87로 설정했습니다."
        }
    }
];


const fewShotPrompt = fewShotExamples.map((ex, idx) => `예시 ${idx + 1}:
시나리오:
${ex.input}
응답:
${JSON.stringify(ex.output, null, 2)}
`).join('\n');


const systemPrompt = `
당신은 공간 분석 AI 전문가입니다. 사용자가 제공하는 거주 공간 시나리오를 읽고 다음 항목들을 포함한 JSON 객체로 응답하세요.

**절대 빠뜨려서는 안 되는 원칙:**
- 사용자가 언급한 모든 요구사항은 반드시 반영되어야 하며, 누락되지 않아야 합니다.
- 언급된 요소(예: 방 개수, 창고 여부, 발코니 사용 목적 등)는 결과에 **정량적으로 반영**되어야 하며, 그 반영 내역은 반드시 reason 필드에 설명되어야 합니다.

**필수 항목:**
- totalArea (제곱미터)
- roomCount (방 수)
- livingRoomRatio (거실:방 비율)
- bathroomCount (화장실 수)
- storageCount (창고 수)
- balconyCount (발코니 수)
- reason (이 추천의 이유 - 반드시 사용자의 표현을 인용하거나, 명확히 반영 여부를 설명할 것)

형식은 JSON이어야 하며, JSON 외에는 어떤 텍스트도 포함하지 마세요.
`;

export async function POST(req: Request) {
    try {
        const { scenario } = await req.json();

        if (!scenario || typeof scenario !== 'string') {
            return NextResponse.json(
                { error: '유효한 시나리오가 제공되지 않았습니다' },
                { status: 400 }
            );
        }

        const { object: factors, usage } = await generateObject({
            model: openai('gpt-4o'),
            schema: QuantitativeFactorsSchema,
            prompt: `${fewShotPrompt}\n사용자 시나리오:\n${scenario}`,
            system: systemPrompt
        });

        return NextResponse.json({ factors, usage });
    } catch (error) {
        console.error('정량 요소 추출 오류:', error);
        return NextResponse.json(
            { error: '정량 요소를 추출하는 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
