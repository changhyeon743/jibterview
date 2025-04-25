// src/app/(blueprint)/api/library/route.ts
// @orchestra blueprint

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        // 페이징 파라미터
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '10');

        // 검색 파라미터
        const searchTerm = searchParams.get('search') || '';

        // 정렬 파라미터
        const sortBy = searchParams.get('sortBy') || 'created_at';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 기본 쿼리 설정
        let query = supabase
            .from('floorplan_library')
            .select(`
        *,
        floorplan_metrics!inner(*)
      `, { count: 'exact' });


        // 검색어 적용
        if (searchTerm) {
            query = query.or(`title.ilike.%${searchTerm}%`);
        }

        // 페이징 적용
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // 정렬 적용
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });

        // 페이징 범위 적용
        query = query.range(from, to);

        // 쿼리 실행
        const { data, error, count } = await query;

        if (error) {
            console.error('도면 라이브러리 조회 오류:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 결과 반환
        return NextResponse.json({
            data,
            meta: {
                page,
                pageSize,
                totalCount: count || 0,
                totalPages: count ? Math.ceil(count / pageSize) : 0
            }
        });

    } catch (error) {
        console.error('도면 라이브러리 API 오류:', error);
        return NextResponse.json(
            { error: '도면 라이브러리를 조회하는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
