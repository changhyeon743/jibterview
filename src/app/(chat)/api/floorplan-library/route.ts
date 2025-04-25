// src/app/api/floorplan-library/route.ts
// @orchestra blueprint

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        // 사용자 인증 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
        }

        // 요청 본문에서 데이터 추출
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const title = formData.get('title') as string;

        if (!file) {
            return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
        }

        if (!title) {
            return NextResponse.json({ error: '도면 이름이 없습니다.' }, { status: 400 });
        }

        // 파일 타입 확인
        const isJson = file.type === 'application/json' || file.name.endsWith('.json') || file.name.endsWith('.seoulgaok');
        if (!isJson) {
            return NextResponse.json({ error: 'JSON 또는 SEOULGAOK 파일만 업로드 가능합니다.' }, { status: 400 });
        }

        // 파일 크기 확인
        if (file.size > 10 * 1024 * 1024) { // 10MB 제한
            return NextResponse.json({ error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 });
        }

        // 파일 내용 읽기
        const fileBuffer = await file.arrayBuffer();
        const fileContent = new TextDecoder().decode(fileBuffer);

        // JSON 형식 확인
        let blueprintJson;
        try {
            blueprintJson = JSON.parse(fileContent);
        } catch (error) {
            return NextResponse.json({ error: '유효한 JSON 파일이 아닙니다.' }, { status: 400 });
        }

        // 파일 이름 생성
        const timestamp = new Date().getTime();
        const filename = `${timestamp}_${file.name}`;

        // 스토리지에 업로드
        const { data: storageData, error: storageError } = await supabase.storage
            .from('floorplan')
            .upload(`blueprints/${filename}`, file);

        if (storageError) {
            return NextResponse.json({ error: `스토리지 오류: ${storageError.message}` }, { status: 500 });
        }

        // 임시 썸네일 경로 설정
        const placeholderImage = 'floorplan/placeholders/blueprint_placeholder.png';

        // 데이터베이스에 레코드 삽입
        const { data, error: dbError } = await supabase
            .from('floorplan_library')
            .insert({
                title,
                blueprint_json: blueprintJson,
                created_at: new Date().toISOString(),
            })
            .select();

        if (dbError) {
            // 스토리지에서 업로드한 파일 정리
            await supabase.storage
                .from('floorplan')
                .remove([`blueprints/${filename}`]);

            return NextResponse.json({ error: `데이터베이스 오류: ${dbError.message}` }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: data[0].id,
                title: data[0].title
            }
        });

    } catch (error) {
        console.error('도면 업로드 오류:', error);
        return NextResponse.json({
            error: '도면 업로드 중 오류가 발생했습니다.'
        }, {
            status: 500
        });
    }
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient();

        // URL에서 쿼리 파라미터 추출
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const isPublic = searchParams.get('public') === 'true';

        let query = supabase
            .from('floorplan_library')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        // 공개 도면만 필터링하는 옵션
        if (isPublic) {
            query = query.eq('is_public', true);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error('도면 라이브러리 조회 오류:', error);
        return NextResponse.json({
            error: '도면 라이브러리를 조회하는 중 오류가 발생했습니다.'
        }, {
            status: 500
        });
    }
}
