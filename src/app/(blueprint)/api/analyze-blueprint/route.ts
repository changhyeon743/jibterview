// src/app/api/analyze-blueprint/route.ts

import { NextResponse } from 'next/server';
import { QuantitativeFactor } from '@/components/custom/quantitative-factor-modal';
import { createClient } from '@/lib/supabase/server';

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
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
        }

        const { blueprintData } = await req.json();
        if (!blueprintData) {
            return NextResponse.json({ error: '도면 데이터가 제공되지 않았습니다.' }, { status: 400 });
        }

        console.log('📐 분석 요청 받은 도면 데이터:', JSON.stringify(blueprintData.floorplanner.rooms));

        const metrics = analyzeBlueprintData(blueprintData);
        const dbMetrics = convertToDbMetrics(metrics);

        console.log('✅ 분석 결과:', metrics);
        console.log('✅ DB 저장용 포맷:', dbMetrics);

        return NextResponse.json({ success: true, metrics, dbMetrics });
    } catch (error) {
        console.error('도면 분석 오류:', error);
        return NextResponse.json({ error: '도면 분석 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

function convertToDbMetrics(metrics: QuantitativeFactor): FloorplanMetrics {
    return {
        total_area: metrics.totalArea,
        room_count: metrics.roomCount,
        living_room_to_room_ratio: metrics.livingRoomRatio,
        bathroom_count: metrics.bathroomCount,
        storage_count: metrics.storageCount,
        veranda_count: metrics.balconyCount,
    };
}

function analyzeBlueprintData(blueprint: any): QuantitativeFactor {
    const floorplanner = blueprint.floorplanner;
    if (!floorplanner || !floorplanner.rooms || !floorplanner.corners) {
        throw new Error("유효한 floorplanner 데이터가 없습니다.");
    }

    const corners = floorplanner.corners;
    const rooms = floorplanner.rooms;

    console.log('📏 코너 수:', Object.keys(corners).length);
    console.log('🚪 방 수:', Object.keys(rooms).length);

    let totalArea = 0;
    let livingRoomArea = 0;
    let otherRoomArea = 0;
    let roomCount = 0;
    let bathroomCount = 0;
    let storageCount = 0;
    let balconyCount = 0;

    for (const roomKey in rooms) {
        const room = rooms[roomKey];
        const name: string = room.name;
        const cornerIds = roomKey.split(',');
        const polygon = cornerIds.map(id => corners[id]).filter(Boolean);
        const area = calculatePolygonAreaFromCorners(polygon);

        console.log(`🧱 [${name}] 면적 계산:`, area.toFixed(2));

        if (!area || area < 0.1) {
            console.log(`⚠️ [${name}] 무시됨 (면적: ${area})`);
            continue;
        }

        totalArea += area;

        if (name.includes('거실') || name.includes('주방')) {
            livingRoomArea += area;
        } else if (name.includes('화장실')) {
            bathroomCount++;
        } else if (name.includes('창고') || name.includes('드레스룸')) {
            storageCount++;
        } else if (name.includes('발코니') || name.includes('베란다')) {
            balconyCount++;
        } else if (name === ('방')) {
            roomCount++;
            otherRoomArea += area;
        }
    }

    roomCount = Math.max(roomCount, 1);
    bathroomCount = Math.max(bathroomCount, 1);

    const livingRoomRatio = livingRoomArea / otherRoomArea;

    console.log('📊 총 면적:', totalArea.toFixed(2));
    console.log('🛏️ 방 개수:', roomCount, '🛁 화장실:', bathroomCount, '📦 창고:', storageCount, '🌿 발코니:', balconyCount);
    console.log('📐 거실:방 면적 비율:', livingRoomRatio.toFixed(3));

    return {
        totalArea: parseFloat(totalArea.toFixed(2)),
        roomCount,
        livingRoomRatio: parseFloat(livingRoomRatio.toFixed(3)),
        bathroomCount,
        storageCount,
        balconyCount,
        reason: `방 ${roomCount}개, 화장실 ${bathroomCount}개, 총 면적 ${totalArea.toFixed(1)}㎡, 거실:방 비율 ${livingRoomArea.toFixed(2)}:${otherRoomArea.toFixed(2)}`
    };
}

function calculatePolygonAreaFromCorners(corners: any[]): number {
    if (!corners || corners.length < 3) return 0;

    let area = 0;
    const n = corners.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const x1 = corners[i].x;
        const y1 = corners[i].y;
        const x2 = corners[j].x;
        const y2 = corners[j].y;
        area += (x1 * y2 - x2 * y1);
    }
    const finalArea = Math.abs(area) / 2;
    console.log('📐 폴리곤 면적 계산 결과:', finalArea.toFixed(2));
    return finalArea;
}
