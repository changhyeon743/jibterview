// src/app/api/blueprint-upload/route.ts
// @orchestra blueprint

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { generateUUID } from '@/lib/utils';

// 메트릭스 인터페이스 정의 - 실제 DB 테이블 구조에 맞춤
interface FloorplanMetrics {
    total_area: number;
    room_count: number;
    living_room_to_room_ratio: number;
    bathroom_count: number;
    storage_count: number;
    veranda_count: number;
}

export async function POST(req: Request) {
    try {
        // 사용자 인증 확인
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
        }

        // FormData 추출
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;
        const metricsStr = formData.get('metrics') as string;

        // 입력 유효성 검증
        if (!file) {
            return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
        }

        if (!title) {
            return NextResponse.json({ error: '도면 이름이 없습니다.' }, { status: 400 });
        }

        if (!metricsStr) {
            return NextResponse.json({ error: '정량 요소 데이터가 없습니다.' }, { status: 400 });
        }

        // 정량 요소 파싱
        let metrics;
        try {
            metrics = JSON.parse(metricsStr);
            console.log("전달된 정량 요소:", metrics);
        } catch (error) {
            return NextResponse.json({ error: '정량 요소 데이터 형식이 잘못되었습니다.' }, { status: 400 });
        }

        // 파일 검증
        if (!file.name.endsWith('.json') && !file.name.endsWith('.seoulgaok')) {
            return NextResponse.json({ error: 'JSON 또는 SEOULGAOK 파일만 지원합니다.' }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB 제한
            return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 });
        }

        // 파일 내용 읽기
        const fileBuffer = await file.arrayBuffer();
        const fileContent = new TextDecoder().decode(fileBuffer);

        // JSON 유효성 검증
        let blueprintJson;
        try {
            blueprintJson = JSON.parse(fileContent);
        } catch (error) {
            return NextResponse.json({ error: '유효한 JSON 파일이 아닙니다.' }, { status: 400 });
        }

        // 파일 이름 생성
        const timestamp = new Date().getTime();
        const filename = `${timestamp}_${file.name}`;
        const uniqueId = generateUUID();

        // 파일에서 정량적 요소 분석 및 DB 저장용 메트릭으로 변환
        const dbMetrics: FloorplanMetrics = convertToDbMetrics(metrics);

        try {

            // 4. floorplan_library에 도면 데이터 저장
            const { data: libraryData, error: libraryError } = await supabase
                .from('floorplan_library')
                .insert({
                    id: uniqueId,
                    title: title,
                    blueprint_json: blueprintJson,
                    created_at: new Date().toISOString(),
                })
                .select();

            if (libraryError) {
                throw new Error(`도면 라이브러리 저장 오류: ${libraryError.message}`);
            }

            // 5. floorplan_metrics에 메트릭 데이터 저장
            const { data: metricsData, error: metricsError } = await supabase
                .from('floorplan_metrics')
                .insert({
                    floorplan_id: uniqueId,
                    total_area: dbMetrics.total_area,
                    room_count: dbMetrics.room_count,
                    living_room_to_room_ratio: dbMetrics.living_room_to_room_ratio,
                    bathroom_count: dbMetrics.bathroom_count,
                    storage_count: dbMetrics.storage_count,
                    veranda_count: dbMetrics.veranda_count,
                    created_at: new Date().toISOString()
                })
                .select();

            if (metricsError) {
                throw new Error(`메트릭 저장 오류: ${metricsError.message}`);
            }

            return NextResponse.json({
                success: true,
                data: {
                    id: uniqueId,
                    title: title,
                }
            });

        } catch (error) {
            // 오류 발생 시 롤백 (이미 업로드된 파일 삭제)
            try {
                await supabase.storage
                    .from('floorplan')
                    .remove([`blueprints/${filename}`]);
            } catch (rollbackError) {
                console.error('롤백 중 오류:', rollbackError);
            }

            console.error('도면 업로드 처리 오류:', error);
            return NextResponse.json({
                error: error instanceof Error ? error.message : '도면 업로드 중 오류가 발생했습니다.'
            }, {
                status: 500
            });
        }

    } catch (error) {
        console.error('도면 업로드 오류:', error);
        return NextResponse.json({
            error: '도면 업로드 중 오류가 발생했습니다.'
        }, {
            status: 500
        });
    }
}

/**
 * 정량 요소를 데이터베이스 형식으로 변환하는 함수
 */
function convertToDbMetrics(uiMetrics: any): FloorplanMetrics {
    // UI 컴포넌트의 정량 요소를 데이터베이스 형식으로 변환
    // 속성명 변환을 통한 일관성 유지
    console.log("DB 메트릭으로 변환 전:", uiMetrics);

    const dbMetrics = {
        total_area: uiMetrics.totalArea || 0,
        room_count: uiMetrics.roomCount || 0,
        living_room_to_room_ratio: uiMetrics.livingRoomRatio || 0.3,
        bathroom_count: uiMetrics.bathroomCount || 0,
        storage_count: uiMetrics.storageCount || 0,
        veranda_count: uiMetrics.balconyCount || 0
    };

    console.log("DB 메트릭으로 변환 후:", dbMetrics);
    return dbMetrics;
}
