// src/lib/floorplan-db.ts
import { createClient } from '@/lib/supabase/server';

interface FloorplanData {
    id?: string;
    chatId: string;
    serializedData: string;
    title?: string;
    metadata?: any;
}

/**
 * 채팅 ID에 해당하는 평면도 데이터를 저장합니다.
 */
export async function saveFloorplan({
                                        chatId,
                                        serializedData,
                                        title,
                                        metadata
                                    }: FloorplanData) {
    try {
        const supabase = await createClient();

        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        const { data, error } = await supabase.rpc('save_floorplan', {
            p_chat_id: chatId,
            p_serialized_data: JSON.parse(serializedData),
            p_title: title || null,
            p_metadata: metadata || null
        });

        if (error) throw error;

        return { id: data };
    } catch (error) {
        console.error('Error saving floorplan:', error);
        throw error;
    }
}

/**
 * 채팅 ID에 해당하는 평면도 데이터를 불러옵니다.
 */
export async function getFloorplanByChatId(chatId: string) {
    try {
        const supabase = await createClient();

        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        const { data, error } = await supabase.rpc('get_floorplan_by_chat_id', {
            p_chat_id: chatId
        });

        if (error) throw error;

        // 결과가 없으면 null 반환
        if (!data || data.length === 0) {
            return null;
        }

        return {
            id: data[0].id,
            chatId: data[0].chat_id,
            serializedData: data[0].serialized_data,
            title: data[0].title,
            metadata: data[0].metadata,
            createdAt: data[0].created_at,
            updatedAt: data[0].updated_at
        };
    } catch (error) {
        console.error('Error fetching floorplan:', error);
        throw error;
    }
}

/**
 * 평면도 버전 히스토리를 불러옵니다.
 */
export async function getFloorplanVersions(floorplanId: string) {
    try {
        const supabase = await createClient();

        const { data: user, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        const { data, error } = await supabase
            .from('floorplan_versions')
            .select('*')
            .eq('floorplan_id', floorplanId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data;
    } catch (error) {
        console.error('Error fetching floorplan versions:', error);
        throw error;
    }
}
