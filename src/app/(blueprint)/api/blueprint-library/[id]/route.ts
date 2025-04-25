// src/app/(blueprint)/api/blueprint-library/[id]/route.ts
// @orchestra blueprint

import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: '도면 ID가 필요합니다.' }, { status: 400 });
        }

        const supabase = await createClient();

        // 사용자 인증 확인
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
        }

        // 도면 데이터 조회
        const { data, error } = await supabase
            .from('floorplan_library')
            .select(`
        *,
        floorplan_metrics!inner(*)
      `)
            .eq('id', id)
            .single();


        if (error) {
            console.error('도면 조회 오류:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: '도면을 찾을 수 없습니다.' }, { status: 404 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error('도면 조회 API 오류:', error);
        return NextResponse.json(
            { error: '도면을 조회하는 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}
