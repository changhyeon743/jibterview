//@orchestra chat
import { NextResponse } from 'next/server';

import { QuantitativeFactor } from '@/components/custom/quantitative-factor-modal';
import { createClient } from '@/lib/supabase/server';

// 두 정량 팩터 간의 유사도 점수를 계산하는 함수 (0-100%)
function calculateSimilarityScore(userFactors: QuantitativeFactor, blueprintFactors: any): number {
    let score = 0;
    let totalWeight = 0;

    // 각 요소별 가중치 정의 (중요도에 따라 조정)
    const weights = {
        totalArea: 25,         // 총 면적이 가장 중요
        roomCount: 20,         // 방 개수 두 번째로 중요
        livingRoomRatio: 20,   // 거실과 방 비율
        bathroomCount: 15,     // 화장실 개수
        storageCount: 10,      // 창고 개수
        balconyCount: 10       // 발코니 개수
    };

    // 총 면적 유사도 (±10㎡ 허용)
    const areaDiff = Math.abs(userFactors.totalArea - blueprintFactors.totalArea);
    if (areaDiff <= 5) score += weights.totalArea;
    else if (areaDiff <= 10) score += weights.totalArea * 0.8;
    else if (areaDiff <= 20) score += weights.totalArea * 0.5;
    else if (areaDiff <= 50) score += weights.totalArea * 0.3;
    else score += weights.totalArea * (1 - Math.min(areaDiff / 100, 1));
    totalWeight += weights.totalArea;

    // 방 개수 유사도 (±1 허용)
    const roomCountDiff = Math.abs(userFactors.roomCount - blueprintFactors.roomCount);
    if (roomCountDiff === 0) score += weights.roomCount;
    else if (roomCountDiff === 1) score += weights.roomCount * 0.7;
    else if (roomCountDiff === 2) score += weights.roomCount * 0.3;
    totalWeight += weights.roomCount;

    // 거실과 방 비율 유사도
    const livingRoomRatioDiff = Math.abs(userFactors.livingRoomRatio - blueprintFactors.livingRoomRatio);
    if (livingRoomRatioDiff <= 0.05) score += weights.livingRoomRatio;
    else if (livingRoomRatioDiff <= 0.1) score += weights.livingRoomRatio * 0.8;
    else if (livingRoomRatioDiff <= 0.2) score += weights.livingRoomRatio * 0.5;
    else score += weights.livingRoomRatio * (1 - Math.min(livingRoomRatioDiff / 0.5, 1));
    totalWeight += weights.livingRoomRatio;

    // 화장실 개수 유사도 (정확히 일치)
    const bathroomCountDiff = Math.abs(userFactors.bathroomCount - blueprintFactors.bathroomCount);
    if (bathroomCountDiff === 0) score += weights.bathroomCount;
    else if (bathroomCountDiff === 1) score += weights.bathroomCount * 0.5;
    totalWeight += weights.bathroomCount;

    // 창고 개수 유사도
    const storageCountDiff = Math.abs(userFactors.storageCount - blueprintFactors.storageCount);
    if (storageCountDiff === 0) score += weights.storageCount;
    else if (storageCountDiff === 1) score += weights.storageCount * 0.5;
    totalWeight += weights.storageCount;

    // 발코니 개수 유사도
    const balconyCountDiff = Math.abs(userFactors.balconyCount - blueprintFactors.balconyCount);
    if (balconyCountDiff === 0) score += weights.balconyCount;
    else if (balconyCountDiff === 1) score += weights.balconyCount * 0.5;
    totalWeight += weights.balconyCount;

    // 최종 유사도 점수를 백분율로 변환 (0-100%)
    return Math.round((score / totalWeight) * 100);
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

        // floorplan_library 테이블에서 도면 데이터 가져오기
        const { data: floorplans, error } = await supabase
            .from('floorplan_library')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching floorplans:', error);
            return NextResponse.json(
                { error: '도면 데이터를 가져오는 데 실패했습니다' },
                { status: 500 }
            );
        }

        // 유사도 점수를 계산하여 도면 추천
        const suggestions = floorplans
            .map(floorplan => {
                try {
                    // blueprint_json 필드에서 정량적 요소 추출
                    const blueprintJson = floorplan.blueprint_json || {};

                    // 도면 분석을 통해 정량적 요소 추출 또는 기본값 사용
                    // JSON 데이터에서 방, 화장실, 창고, 발코니 등을 식별하여 수 계산
                    const parsedBlueprint = typeof blueprintJson === 'string'
                        ? JSON.parse(blueprintJson)
                        : blueprintJson;

                    // 분석 로직: 방, 거실 등의 이름을 확인하여 카운트
                    const rooms = parsedBlueprint.rooms || {};
                    let roomCount = 0;
                    let bathroomCount = 0;
                    let storageCount = 0;
                    let balconyCount = 0;
                    let livingRoomArea = 0;
                    let totalArea = 0;

                    // 필드 구조에 따라 적절히 파싱
                    if (Array.isArray(rooms)) {
                        // 배열 구조인 경우
                        for (const room of rooms) {
                            const roomName = (room.name || '').toLowerCase();
                            const roomArea = room.area || 0;

                            totalArea += roomArea;

                            if (roomName.includes('방') || roomName.includes('침실') ||
                                roomName.includes('서재') || roomName.includes('작업실')) {
                                roomCount++;
                            } else if (roomName.includes('화장실') || roomName.includes('욕실') ||
                                roomName.includes('toilet') || roomName.includes('bathroom')) {
                                bathroomCount++;
                            } else if (roomName.includes('창고') || roomName.includes('수납') ||
                                roomName.includes('storage') || roomName.includes('pantry')) {
                                storageCount++;
                            } else if (roomName.includes('발코니') || roomName.includes('베란다') ||
                                roomName.includes('balcony')) {
                                balconyCount++;
                            } else if (roomName.includes('거실') || roomName.includes('living')) {
                                livingRoomArea += roomArea;
                            }
                        }
                    } else {
                        // 객체 구조인 경우 - 키 기반 접근
                        for (const key in rooms) {
                            if (rooms.hasOwnProperty(key)) {
                                const room = rooms[key];
                                const roomName = (room.name || '').toLowerCase();
                                const roomArea = room.area || 0;

                                totalArea += roomArea;

                                if (roomName.includes('방') || roomName.includes('침실') ||
                                    roomName.includes('서재') || roomName.includes('작업실')) {
                                    roomCount++;
                                } else if (roomName.includes('화장실') || roomName.includes('욕실') ||
                                    roomName.includes('toilet') || roomName.includes('bathroom')) {
                                    bathroomCount++;
                                } else if (roomName.includes('창고') || roomName.includes('수납') ||
                                    roomName.includes('storage') || roomName.includes('pantry')) {
                                    storageCount++;
                                } else if (roomName.includes('발코니') || roomName.includes('베란다') ||
                                    roomName.includes('balcony')) {
                                    balconyCount++;
                                } else if (roomName.includes('거실') || roomName.includes('living')) {
                                    livingRoomArea += roomArea;
                                }
                            }
                        }
                    }

                    // 면적이 0이면 기본값 설정
                    if (totalArea === 0) totalArea = 60;

                    // 거실 비율 계산 (거실이 없으면 기본값 0.3)
                    const livingRoomRatio = totalArea > 0 ? (livingRoomArea / totalArea) : 0.3;

                    // 유사도 점수 계산
                    const matchScore = calculateSimilarityScore(factors, {
                        totalArea: totalArea,
                        roomCount: roomCount || 1,
                        livingRoomRatio: livingRoomRatio,
                        bathroomCount: bathroomCount || 1,
                        storageCount: storageCount || 0,
                        balconyCount: balconyCount || 0
                    });

                    return {
                        id: floorplan.id,
                        title: floorplan.id || '이름 없는 도면',
                        description: `총 면적: ${totalArea}㎡, 방 ${roomCount}개, 화장실 ${bathroomCount}개`,
                        matchScore,
                        previewImageUrl: floorplan.image_path,
                        serializedData: JSON.stringify(parsedBlueprint) || '{}'
                    };
                } catch (err) {
                    console.error(`Error processing floorplan ${floorplan.id}:`, err);

                    // 파싱 오류 시 기본값으로 대체
                    const matchScore = calculateSimilarityScore(factors, {
                        totalArea: 60,
                        roomCount: 1,
                        livingRoomRatio: 0.3,
                        bathroomCount: 1,
                        storageCount: 0,
                        balconyCount: 0
                    });

                    return {
                        id: floorplan.id,
                        title: floorplan.id || '이름 없는 도면',
                        description: '기본 도면 (파싱 오류)',
                        matchScore,
                        previewImageUrl: floorplan.image_path,
                        serializedData: '{}'
                    };
                }
            })
            .filter(Boolean) // null 값 제거
            .sort((a, b) => b.matchScore - a.matchScore) // 유사도 높은 순으로 정렬
            .slice(0, 5); // 상위 5개만 반환

        // 테스트 데이터 생성 (실제 데이터가 없을 경우)
        if (suggestions.length === 0) {
            // 샘플 도면 데이터 추가
            const testBlueprints = [
                {
                    id: 'sample-1',
                    title: '2인 가족 아파트',
                    description: '총 면적: 65㎡, 방 2개, 화장실 1개',
                    matchScore: 85,
                    previewImageUrl: '/images/sample-blueprint-1.png',
                    serializedData: JSON.stringify({
                        floorplanner: {
                            corners: {
                                "c1": {"x": 0, "y": 0, "elevation": 0},
                                "c2": {"x": 800, "y": 0, "elevation": 0},
                                "c3": {"x": 800, "y": 800, "elevation": 0},
                                "c4": {"x": 0, "y": 800, "elevation": 0}
                            },
                            walls: [
                                {"corner1": "c1", "corner2": "c2"},
                                {"corner1": "c2", "corner2": "c3"},
                                {"corner1": "c3", "corner2": "c4"},
                                {"corner1": "c4", "corner2": "c1"}
                            ],
                            rooms: {}
                        },
                        items: []
                    })
                },
                {
                    id: 'sample-2',
                    title: '스튜디오 원룸',
                    description: '총 면적: 30㎡, 방 1개, 화장실 1개',
                    matchScore: 70,
                    previewImageUrl: '/images/sample-blueprint-2.png',
                    serializedData: JSON.stringify({
                        floorplanner: {
                            corners: {
                                "c1": {"x": 0, "y": 0, "elevation": 0},
                                "c2": {"x": 500, "y": 0, "elevation": 0},
                                "c3": {"x": 500, "y": 600, "elevation": 0},
                                "c4": {"x": 0, "y": 600, "elevation": 0}
                            },
                            walls: [
                                {"corner1": "c1", "corner2": "c2"},
                                {"corner1": "c2", "corner2": "c3"},
                                {"corner1": "c3", "corner2": "c4"},
                                {"corner1": "c4", "corner2": "c1"}
                            ],
                            rooms: {}
                        },
                        items: []
                    })
                },
                {
                    id: 'sample-3',
                    title: '3인 가족 주택',
                    description: '총 면적: 85㎡, 방 3개, 화장실 2개',
                    matchScore: 60,
                    previewImageUrl: '/images/sample-blueprint-3.png',
                    serializedData: JSON.stringify({
                        floorplanner: {
                            corners: {
                                "c1": {"x": 0, "y": 0, "elevation": 0},
                                "c2": {"x": 1000, "y": 0, "elevation": 0},
                                "c3": {"x": 1000, "y": 800, "elevation": 0},
                                "c4": {"x": 0, "y": 800, "elevation": 0}
                            },
                            walls: [
                                {"corner1": "c1", "corner2": "c2"},
                                {"corner1": "c2", "corner2": "c3"},
                                {"corner1": "c3", "corner2": "c4"},
                                {"corner1": "c4", "corner2": "c1"}
                            ],
                            rooms: {}
                        },
                        items: []
                    })
                }
            ];

            return NextResponse.json({ suggestions: testBlueprints });
        }

        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error('Error in blueprint suggestions API:', error);
        return NextResponse.json(
            { error: '도면 추천 중 오류가 발생했습니다' },
            { status: 500 }
        );
    }
}
