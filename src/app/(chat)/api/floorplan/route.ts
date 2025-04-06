// src/app/(chat)/api/floorplan/route.ts
// @orchestra blueprint

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateUUID } from '@/lib/utils';
import { saveChat } from '@/db/mutations';

// 채팅 존재 여부 확인 함수
async function ensureChatExists(chatId: string, userId: string, supabase: any) {
    // 채팅이 존재하는지 확인
    const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .eq('user_id', userId)
        .single();

    // 채팅이 존재하지 않으면 생성
    if (!chat) {
        await saveChat({
            id: chatId,
            userId: userId,
            title: `Blueprint Session ${new Date().toLocaleDateString()}`
        });

        // 생성 확인
        const { data: newChat } = await supabase
            .from('chats')
            .select('id')
            .eq('id', chatId)
            .single();

        return newChat;
    }

    return chat;
}

// 데이터베이스에서 평면도 가져오기
async function getFloorplanFromDB(chatId: string, userId: string, supabase: any) {
    const { data, error } = await supabase
        .from('floorplans')
        .select('*')
        .eq('chat_id', chatId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) throw error;
    return data?.[0];
}

// 데이터베이스에 평면도 저장하기
async function saveFloorplanToDB(chatId: string, userId: string, serializedData: string, title: string, metadata: any, supabase: any) {
    // 먼저 채팅 존재 여부 확인 및 필요시 생성
    await ensureChatExists(chatId, userId, supabase);

    // 이제 안전하게 평면도 저장 가능
    const { data, error } = await supabase
        .from('floorplans')
        .upsert({
            id: generateUUID(), // 고유 ID 생성
            chat_id: chatId,
            user_id: userId,
            serialized_data: serializedData,
            title: title || `Blueprint for ${chatId}`,
            metadata,
            created_at: new Date().toISOString()
        })
        .select();

    if (error) throw error;
    return data?.[0];
}

// 평면도 데이터 가져오기
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get('chatId');

        if (!chatId) {
            return NextResponse.json({ error: 'Missing chatId parameter' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const floorplan = await getFloorplanFromDB(chatId, user.id, supabase);

        return NextResponse.json({ floorplan });
    } catch (error: any) {
        console.error('Error fetching floorplan:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 평면도 데이터 저장하기
export async function POST(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get('chatId');

        if (!chatId) {
            return NextResponse.json({ error: 'Missing chatId parameter' }, { status: 400 });
        }

        const { serializedData, title, metadata } = await req.json();

        if (!serializedData) {
            return NextResponse.json({ error: 'Missing serializedData' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 평면도 저장 (자동으로 채팅 존재 여부 확인)
        const result = await saveFloorplanToDB(
            chatId,
            user.id,
            serializedData,
            title || `Blueprint for ${chatId}`,
            {
                ...metadata,
                updatedAt: new Date().toISOString(),
                userId: user.id
            },
            supabase
        );

        return NextResponse.json({ id: result.id, success: true });
    } catch (error: any) {
        console.error('Error saving floorplan:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
