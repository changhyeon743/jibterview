// Blueprint3D.tsx
// @orchestra blueprint
"use client";

import React, {useState} from "react";
import { useBlueprintSetup } from "./hooks/useBlueprintSetup";
import { useItemSelection } from "./hooks/useItemSelection";
import { useRoomSelection } from "./hooks/useRoomSelection";
import { useItemManagement } from "./hooks/useItemManagement";
import ControlPanel from "./components/ControlPanel";
import ItemEditor from "./components/ItemEditor";
import { VIEWER_IDS } from "./constants";
import ItemSelector from "@/components/blueprint/components/ItemSelector";
import RoomTextureSelector from "@/components/blueprint/components/RoomTextureSelector";
import LoadingProgress from "@/components/blueprint/components/loading-progress";
import {EVENT_ITEM_LOADED, EVENT_ITEM_LOADING} from "@/lib/blueprint/core/events";

interface Blueprint3DProps {
    initialData?: string;
}

export default function Blueprint3D({ initialData }: Blueprint3DProps) {
    const { containerRef, blueprint } = useBlueprintSetup(initialData);
    const { selectedItem, setSelectedItem, deleteItem } =
        useItemSelection(blueprint);
    const { selectedRoom, roomName, setRoomName } = useRoomSelection(blueprint);
    const { items, addItem } = useItemManagement(blueprint);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    // 로딩 이벤트 리스너 설정
    React.useEffect(() => {
        if (!blueprint?.roomplanner) return;

        console.log(blueprint.model.roomItems)

        let totalItems = 0;
        let loadedItems = 0;
        let wallsProgress = 0;

        const handleItemLoaded = () => {
            console.log(loadedItems, totalItems)
            loadedItems++;
            const progress = (loadedItems / totalItems) * 50 + wallsProgress;
            setLoadingProgress(progress);

            if (loadedItems > totalItems-5) {
                setIsLoading(false);
            }
        };

        const handleWallsProgress = (evt: any) => {
            wallsProgress = evt.progress * 0.5; // 벽 진행률은 전체의 50%
            setLoadingProgress(wallsProgress + (loadedItems / totalItems) * 50);
        };

        if (blueprint.model?.roomItems) {
            totalItems = blueprint.model.roomItems.length;
        }

        blueprint.model.addEventListener(EVENT_ITEM_LOADED, handleItemLoaded);
        blueprint.model.addEventListener('wallsProgress', handleWallsProgress);

        return () => {
            blueprint.model.removeEventListener(EVENT_ITEM_LOADED, handleItemLoaded);
            blueprint.model.removeEventListener('wallsProgress', handleWallsProgress);
        };
    }, [blueprint]);

    return (
        <div
            className="relative mx-auto border shadow-lg overflow-hidden"
            style={{ width: "100%", height: "100%" }}
        >
            <LoadingProgress progress={loadingProgress} isLoading={isLoading} />

            {/*<ControlPanel*/}
            {/*    blueprint={blueprint}*/}
            {/*    selectedRoom={selectedRoom}*/}
            {/*    roomName={roomName}*/}
            {/*    setRoomName={setRoomName}*/}
            {/*/>*/}

            {/*<div className="absolute -top-2 right-2 z-50 flex flex-col space-y-2">*/}
            {/*    {selectedItem && (*/}
            {/*        <ItemEditor*/}
            {/*            selectedItem={selectedItem}*/}
            {/*            setSelectedItem={setSelectedItem}*/}
            {/*            deleteItem={deleteItem}*/}
            {/*        />*/}
            {/*    )}*/}
            {/*</div>*/}

            {/*<ItemSelector items={items} addItem={addItem} />*/}
            {/*/!*<LoadingProgress blueprint={blueprint}/>*!/*/}
            {/*<RoomTextureSelector blueprint={blueprint} />*/}

            <div
                ref={containerRef}
                className="absolute top-0 left-0 w-full h-full"
            >
                <div id="viewer3d-measurement-labels" className="hidden"></div>
                <div
                    id={VIEWER_IDS.FLOORPLANNER}
                    className="absolute top-0 left-0 right-0 bottom-0 transition-opacity duration-500 ease-in-out"
                ></div>
                <div
                    id={VIEWER_IDS.VIEWER3D}
                    className="absolute top-0 left-0 right-0 bottom-0 transition-opacity duration-500 ease-in-out opacity-0 pointer-events-none"
                ></div>
            </div>
        </div>
    );
}
