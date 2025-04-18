'use client';
//@orchestra chat

import RoomNetworkGraph from '@/components/custom/room-network-graph';
import {RoomNetwork} from "@/lib/blueprint/analysis";

interface BlueprintAnalysisVisualizerProps {
    roomNetwork: RoomNetwork;
}

export function BlueprintAnalysisVisualizer({ roomNetwork }: BlueprintAnalysisVisualizerProps) {
    if (!roomNetwork) return null;

    return (
        <div className="w-full">
            <RoomNetworkGraph roomNetwork={roomNetwork} />
        </div>
    );
}
