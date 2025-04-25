//@orchestra chat
import { NextResponse } from 'next/server';

import { QuantitativeFactor } from '@/components/custom/quantitative-factor-modal';
import { createClient } from '@/lib/supabase/server';

// 정량 팩터 간의 유사도 점수 계산 함수 (0-100%)
function calculateSimilarityScore(userFactors: QuantitativeFactor, blueprintMetrics: any): number {
    let score = 0;
    let totalWeight = 0;

    // 각 요소별 가중치 정의 (중요도에 따라 조정)
    const weights = {
        totalArea: 25,         // 총 면적이 가장 중요
        roomCount: 20,         // 방 개수 두 번째로 중요
        livingRoomRatio: 20,   // 거실과 나머지 면적 비율
        bathroomCount: 15,     // 화장실 개수
        storageCount: 10,      // 창고 개수
        balconyCount: 10       // 발코니 개수
    };

    // 총 면적 유사도 (±10㎡ 허용)
    const areaDiff = Math.abs(userFactors.totalArea - blueprintMetrics.total_area);
    if (areaDiff <= 5) score += weights.totalArea;
    else if (areaDiff <= 10) score += weights.totalArea * 0.8;
    else if (areaDiff <= 20) score += weights.totalArea * 0.5;
    else if (areaDiff <= 50) score += weights.totalArea * 0.3;
    else score += weights.totalArea * (1 - Math.min(areaDiff / 100, 1));
    totalWeight += weights.totalArea;

    // 방 개수 유사도 (±1 허용)
    const roomCountDiff = Math.abs(userFactors.roomCount - blueprintMetrics.room_count);
    if (roomCountDiff === 0) score += weights.roomCount;
    else if (roomCountDiff === 1) score += weights.roomCount * 0.7;
    else if (roomCountDiff === 2) score += weights.roomCount * 0.3;
    totalWeight += weights.roomCount;

    // 거실과 나머지 면적 비율 유사도
    const livingRoomRatioDiff = Math.abs(userFactors.livingRoomRatio - blueprintMetrics.living_room_to_room_ratio);
    if (livingRoomRatioDiff <= 0.05) score += weights.livingRoomRatio;
    else if (livingRoomRatioDiff <= 0.1) score += weights.livingRoomRatio * 0.8;
    else if (livingRoomRatioDiff <= 0.2) score += weights.livingRoomRatio * 0.5;
    else score += weights.livingRoomRatio * (1 - Math.min(livingRoomRatioDiff / 0.5, 1));
    totalWeight += weights.livingRoomRatio;

    // 화장실 개수 유사도 (정확히 일치)
    const bathroomCountDiff = Math.abs(userFactors.bathroomCount - blueprintMetrics.bathroom_count);
    if (bathroomCountDiff === 0) score += weights.bathroomCount;
    else if (bathroomCountDiff === 1) score += weights.bathroomCount * 0.5;
    totalWeight += weights.bathroomCount;

    // 창고 개수 유사도
    const storageCountDiff = Math.abs(userFactors.storageCount - blueprintMetrics.storage_count);
    if (storageCountDiff === 0) score += weights.storageCount;
    else if (storageCountDiff === 1) score += weights.storageCount * 0.5;
    totalWeight += weights.storageCount;

    // 발코니 개수 유사도
    const balconyCountDiff = Math.abs(userFactors.balconyCount - blueprintMetrics.veranda_count);
    if (balconyCountDiff === 0) score += weights.balconyCount;
    else if (balconyCountDiff === 1) score += weights.balconyCount * 0.5;
    totalWeight += weights.balconyCount;

    // 최종 유사도 점수를 백분율로 변환 (0-100%)
    return Math.round((score / totalWeight) * 100);
}

// 메트릭스 데이터 인터페이스 정의
interface FloorplanMetric {
    id: string;
    floorplan_id: string;
    total_area: number;
    room_count: number;
    living_room_to_room_ratio: number;
    bathroom_count: number;
    storage_count: number;
    veranda_count: number;
    created_at: string;
}

export async function POST(req: Request) {
    try {
        // 사용자 인증 확인
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 요청 데이터 추출
        const { factors } = await req.json();

        if (!factors) {
            return NextResponse.json(
                { error: '유효한 정량적 요소가 제공되지 않았습니다' },
                { status: 400 }
            );
        }

        // 1. 먼저 모든 메트릭 데이터 가져오기
        const { data: metrics, error: metricsError } = await supabase
            .from('floorplan_metrics')
            .select('*');

        if (metricsError) {
            console.error('Error fetching metrics:', metricsError);
            return NextResponse.json(
                { error: '메트릭 데이터를 가져오는 데 실패했습니다' },
                { status: 500 }
            );
        }

        // 2. 유사도 점수 계산 및 상위 항목 선별
        const scoredMetrics = metrics
            .map((metric: FloorplanMetric) => ({
                ...metric,
                matchScore: calculateSimilarityScore(factors, metric)
            }))
            .sort((a, b) => b.matchScore - a.matchScore) // 유사도 높은 순으로 정렬
            .slice(0, 5); // 상위 5개만 선택

        // 3. 선별된 도면 ID만 가져오기
        const topFloorplanIds = scoredMetrics.map(item => item.floorplan_id);

        if (topFloorplanIds.length === 0) {
            return NextResponse.json({ suggestions: [] });
        }

        // 4. 선별된 ID에 해당하는 도면 데이터만 가져오기
        const { data: floorplans, error: floorplansError } = await supabase
            .from('floorplan_library')
            .select('*')
            .in('id', topFloorplanIds);

        if (floorplansError) {
            console.error('Error fetching floorplans:', floorplansError);
            return NextResponse.json(
                { error: '도면 데이터를 가져오는 데 실패했습니다' },
                { status: 500 }
            );
        }

        // 5. 최종 추천 도면 목록 생성
        const suggestions = scoredMetrics.map(scoredMetric => {
            // 해당 메트릭에 일치하는 도면 찾기
            const floorplan = floorplans.find(fp => fp.id === scoredMetric.floorplan_id);

            if (!floorplan) return null;

            try {
                // blueprint_json 필드에서 JSON 데이터 추출
                const blueprintJson = floorplan.blueprint_json || {};
                const parsedBlueprint = typeof blueprintJson === 'string'
                    ? JSON.parse(blueprintJson)
                    : blueprintJson;

                return {
                    id: floorplan.id,
                    title: floorplan.title || '이름 없는 도면',
                    description: `총 면적: ${scoredMetric.total_area.toFixed(1)}㎡, 방 ${scoredMetric.room_count}개, 화장실 ${scoredMetric.bathroom_count}개`,
                    matchScore: scoredMetric.matchScore,
                    previewImageUrl: floorplan.image_path,
                    serializedData: JSON.stringify(parsedBlueprint) || '{}'
                };
            } catch (err) {
                console.error(`Error processing floorplan ${floorplan.id}:`, err);
                return null;
            }
        }).filter(Boolean); // null 값 제거

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Error in blueprint suggestions API:', error);
        return NextResponse.json(
            { error: '도면 추천 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
