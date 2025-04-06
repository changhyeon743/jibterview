// src/components/blueprint/Blueprint3D.tsx
"use client";

import React, { useState, useEffect } from "react";

import ItemSelector from "@/components/blueprint/components/ItemSelector";
import LoadingProgress from "@/components/blueprint/components/loading-progress";
import RoomTextureSelector from "@/components/blueprint/components/RoomTextureSelector";
import { useBlueprint } from "@/contexts/BlueprintContext";
import { EVENT_ITEM_LOADED, EVENT_WALLS_COMPLETED } from "@/lib/blueprint/core/events";

import ControlPanel from "./components/ControlPanel";
import ItemEditor from "./components/ItemEditor";
import { VIEWER_IDS } from "./constants";
import { useBlueprintSetup } from "./hooks/useBlueprintSetup";
import { useItemManagement } from "./hooks/useItemManagement";
import { useItemSelection } from "./hooks/useItemSelection";
import { useRoomSelection } from "./hooks/useRoomSelection";

interface Blueprint3DProps {
    initialData?: string;
}

export default function Blueprint3D({ initialData }: Blueprint3DProps) {
    // Blueprint Context
    const { blueprint, saveBlueprintData } = useBlueprint();

    // 필요한 훅 사용
    const { containerRef } = useBlueprintSetup(initialData);
    const { selectedItem, setSelectedItem, deleteItem } = useItemSelection(blueprint);
    const { selectedRoom, roomName, setRoomName } = useRoomSelection(blueprint);
    const { items, addItem } = useItemManagement();

    // 로딩 상태
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // 자동 저장 설정
    // useEffect(() => {
    //     if (blueprint && chatId) {
    //         // 첫 로드 시 데이터 저장 (필요한 경우)
    //         const timer = setTimeout(() => {
    //             saveBlueprintData(chatId);
    //         }, 2000);
    //
    //         return () => clearTimeout(timer);
    //     }
    // }, [blueprint, chatId, saveBlueprintData]);

    // 로딩 진행 상태 관리
    useEffect(() => {
        if (!blueprint?.model) return;

        let totalItems = 0;
        let loadedItems = 0;

        const handleItemLoaded = () => {
            loadedItems++;
            const progress = Math.min(100, (loadedItems / Math.max(1, totalItems)) * 100);
            setLoadingProgress(progress);

            if (loadedItems >= totalItems) {
                setIsLoading(false);
            }
        };

        const handleWallsCompleted = () => {
            // 벽 완성 시 로딩 완료로 간주
            setIsLoading(false);
            setLoadingProgress(100);
        };

        if (blueprint.model.roomItems) {
            totalItems = Math.max(1, blueprint.model.roomItems.length);
        }

        blueprint.model.addEventListener(EVENT_ITEM_LOADED, handleItemLoaded);
        blueprint.model.addEventListener(EVENT_WALLS_COMPLETED, handleWallsCompleted);

        // 일정 시간 후에도 로딩이 끝나지 않으면 강제로 완료 처리
        const timeoutId = setTimeout(() => {
            setIsLoading(false);
            setLoadingProgress(100);
        }, 10000);

        return () => {
            blueprint.model.removeEventListener(EVENT_ITEM_LOADED, handleItemLoaded);
            blueprint.model.removeEventListener(EVENT_WALLS_COMPLETED, handleWallsCompleted);
            clearTimeout(timeoutId);
        };
    }, [blueprint]);

    return (
        <div className="relative mx-auto border shadow-lg overflow-hidden" style={{ width: "100%", height: "100%" }}>
            {/* 로딩 표시 */}
            <LoadingProgress progress={loadingProgress} isLoading={isLoading} />

            {/* 컨트롤 패널 */}
            <ControlPanel
                blueprint={blueprint}
                selectedRoom={selectedRoom}
                roomName={roomName}
                setRoomName={setRoomName}
            />

            {/* 선택된 아이템 에디터 */}
            {selectedItem && (
                <div className="absolute -top-2 right-2 z-50 flex flex-col space-y-2">
                    <ItemEditor
                        selectedItem={selectedItem}
                        setSelectedItem={setSelectedItem}
                        deleteItem={deleteItem}
                    />
                </div>
            )}

            {/* 아이템 선택기 */}
            <ItemSelector items={items} addItem={addItem} />

            {/* 텍스처 선택기 */}
            {/*<RoomTextureSelector blueprint={blueprint} />*/}

            {/* 렌더링 컨테이너 */}
            <div ref={containerRef} className="absolute top-0 left-0 size-full">
                <div id="viewer3d-measurement-labels" className="hidden"></div>
                <div
                    id={VIEWER_IDS.FLOORPLANNER}
                    className="absolute inset-0 transition-opacity duration-500 ease-in-out"
                ></div>
                <div
                    id={VIEWER_IDS.VIEWER3D}
                    className="absolute inset-0 transition-opacity duration-500 ease-in-out opacity-0 pointer-events-none"
                ></div>
            </div>
        </div>
    );
}
