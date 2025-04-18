"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

import { buildRoomNetwork, RoomNetwork } from '@/lib/blueprint/analysis';
import { EVENT_UPDATED, EVENT_NEW_ITEM, EVENT_ITEM_REMOVED } from '@/lib/blueprint/core/events';

// Context 타입 정의
interface BlueprintContextType {
    blueprint: any | null;
    blueprintData: string;
    roomNetwork: RoomNetwork | null;

    addItem: (itemData: any) => void;
    setBlueprint: (instance: any) => void;
    setBlueprintData: (data: string) => void;
    saveBlueprintData: (chatId: string) => Promise<void>;
}

// 기본 Context 생성
const BlueprintContext = createContext<BlueprintContextType>({
    blueprint: null,
    blueprintData: '',
    roomNetwork: null,
    addItem: () => {},
    setBlueprint: () => {},
    setBlueprintData: () => {},
    saveBlueprintData: async () => {},
});

// Provider 컴포넌트
export const BlueprintProvider = ({ children }: { children: ReactNode }) => {
    const [blueprint, setBlueprint] = useState<any | null>(null);
    const [blueprintData, setBlueprintData] = useState<string>('');
    const [roomNetwork, setRoomNetwork] = useState<RoomNetwork | null>(null);

    // Blueprint 모델 변화 시 네트워크 갱신
    useEffect(() => {
        if (!blueprint?.model) return;

        const updateNetwork = () => {
            try {
                const raw = blueprint.model.exportFloorplan();
                setBlueprintData(raw);

                const network = buildRoomNetwork(raw);
                setRoomNetwork(network);
            } catch (error) {
                console.error('Blueprint 네트워크 생성 오류:', error);
            }
        };

        blueprint.model.addEventListener(EVENT_UPDATED, updateNetwork);
        blueprint.model.addEventListener(EVENT_NEW_ITEM, updateNetwork);
        blueprint.model.addEventListener(EVENT_ITEM_REMOVED, updateNetwork);

        // 초기 실행
        updateNetwork();

        return () => {
            blueprint.model.removeEventListener(EVENT_UPDATED, updateNetwork);
            blueprint.model.removeEventListener(EVENT_NEW_ITEM, updateNetwork);
            blueprint.model.removeEventListener(EVENT_ITEM_REMOVED, updateNetwork);
        };
    }, [blueprint]);

    // 아이템 추가
    const addItem = useCallback((itemData: any) => {
        if (!blueprint?.model) {
            console.error('Blueprint 모델 미존재');
            return;
        }
        try {
            blueprint.model.addItemByMetaData(itemData);
        } catch (error) {
            console.error('아이템 추가 실패:', error);
        }
    }, [blueprint]);

    // 데이터 저장
    const saveBlueprintData = useCallback(async (chatId: string) => {
        if (!blueprint?.model || !chatId) return;
        try {
            const serialized = blueprint.model.exportSerialized();
            const response = await fetch(`/api/floorplan?chatId=${chatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serializedData: serialized, title: `Blueprint for ${chatId}`, metadata: { lastUpdated: new Date().toISOString() } })
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error('저장 오류:', errorData);
            }
        } catch (error) {
            console.error('Blueprint 저장 실패:', error);
        }
    }, [blueprint]);

    // Context 값
    const value: BlueprintContextType = {
        blueprint,
        blueprintData,
        roomNetwork,
        addItem,
        setBlueprint,
        setBlueprintData,
        saveBlueprintData,
    };

    return <BlueprintContext.Provider value={value}>{children}</BlueprintContext.Provider>;
};

// 사용 훅
export const useBlueprint = () => useContext(BlueprintContext);
