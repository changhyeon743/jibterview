"use client"
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

import { EVENT_UPDATED, EVENT_NEW_ITEM, EVENT_ITEM_REMOVED } from '@/lib/blueprint/core/events';

// 간소화된 Context 타입 정의
interface BlueprintContextType {
    // 핵심 상태만 유지
    blueprint: any | null;
    blueprintData: string;

    // 물체 추가 함수 (단순화된 핵심 기능)
    addItem: (itemData: any) => void;

    // 기본 세터 함수
    setBlueprint: (instance: any) => void;
    setBlueprintData: (data: string) => void;

    // 서버 저장 기능
    saveBlueprintData: (chatId: string) => Promise<void>;
}

// 기본 Context 생성
const BlueprintContext = createContext<BlueprintContextType>({
    blueprint: null,
    blueprintData: '',

    addItem: () => {},
    setBlueprint: () => {},
    setBlueprintData: () => {},
    saveBlueprintData: async () => {},
});

// BlueprintProvider 컴포넌트
export const BlueprintProvider = ({ children }: { children: ReactNode }) => {
    // 핵심 상태
    const [blueprint, setBlueprint] = useState<any | null>(null);
    const [blueprintData, setBlueprintData] = useState<string>('');

    // Blueprint 모델이 변경될 때 데이터 업데이트
    useEffect(() => {
        console.log("blueprint updated in Context!")
        if (!blueprint?.model) return;
        console.log("blueprint updated in Context!2")
        // 이벤트 핸들러 - 간소화된 버전
        const handleModelUpdate = () => {
            try {
                // 모델이 업데이트되면 즉시 직렬화
                const serializedData = blueprint.model.exportSerialized();
                setBlueprintData(serializedData);
            } catch (error) {
                console.error('Blueprint 데이터 직렬화 오류:', error);
            }
        };
        console.log("blueprint updated in Context!3")
        // 이벤트 리스너 등록
        blueprint.model.addEventListener(EVENT_UPDATED, handleModelUpdate);
        blueprint.model.addEventListener(EVENT_NEW_ITEM, handleModelUpdate);
        blueprint.model.addEventListener(EVENT_ITEM_REMOVED, handleModelUpdate);
        console.log("blueprint updated in Context!4")

        return () => {
            // 이벤트 리스너 정리
            blueprint.model.removeEventListener(EVENT_UPDATED, handleModelUpdate);
            blueprint.model.removeEventListener(EVENT_NEW_ITEM, handleModelUpdate);
            blueprint.model.removeEventListener(EVENT_ITEM_REMOVED, handleModelUpdate);
        };
    }, [blueprint]);

    // 물체 추가 함수
    const addItem = useCallback((itemData: any) => {
        if (!blueprint?.model) {
            console.error('Blueprint 모델이 초기화되지 않았습니다');
            return;
        }

        try {
            blueprint.model.addItemByMetaData(itemData);
        } catch (error) {
            console.error('아이템 추가 실패:', error);
        }
    }, [blueprint]);

    // 데이터 저장 함수
    const saveBlueprintData = useCallback(async (chatId: string) => {
        if (!blueprint?.model || !chatId) return;

        try {
            const serializedData = blueprint.model.exportSerialized();

            // 서버에 저장 - 오류 처리 추가
            const response = await fetch(`/api/floorplan?chatId=${chatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serializedData,
                    title: `Blueprint for chat ${chatId}`,
                    metadata: { lastUpdated: new Date().toISOString() }
                }),
            });

            // 응답이 성공적이지 않은 경우 오류 처리
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Blueprint 데이터 저장 응답 실패:', errorData);

                // 필요한 경우 추가 조치
                if (response.status === 500 && errorData.error?.includes('foreign key constraint')) {
                    console.warn('채팅 ID가 존재하지 않아 평면도를 저장할 수 없습니다. 채팅을 먼저 생성해야 합니다.');
                    // 여기서 사용자에게 알림을 표시하거나 추가 조치를 취할 수 있습니다
                }
            }
        } catch (error) {
            console.error('Blueprint 데이터 저장 실패:', error);
        }
    }, [blueprint]);

    // Context 값
    const value = {
        blueprint,
        blueprintData,

        addItem,
        setBlueprint,
        setBlueprintData,
        saveBlueprintData,
    };

    return (
        <BlueprintContext.Provider value={value}>
            {children}
        </BlueprintContext.Provider>
    );
};

// 사용 훅
export const useBlueprint = () => useContext(BlueprintContext);
