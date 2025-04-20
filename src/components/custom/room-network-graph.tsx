'use client';

import { Graph } from 'react-d3-graph';

import { RoomNetwork } from '@/lib/blueprint/analysis';

export default function RoomNetworkGraph({ roomNetwork }: { roomNetwork: RoomNetwork }) {
    const roomCount = roomNetwork.rooms.length;
    const itemCount = roomNetwork.items.length;
    const edgeCount = Math.floor(roomNetwork.edges.length / 2);
    const nodeCount = roomCount + itemCount;
    const isSingleNode = nodeCount === 1;

    const data = {
        nodes: [
            ...roomNetwork.rooms.map(room => ({
                id: room.id,
                label: room.name,
                color: '#0070f3',
            })),
            ...roomNetwork.items.map((item, idx) => ({
                id: `item-${idx}`,
                label: item.name,
                color: '#e91e63',
            })),
        ],
        links: [
            ...roomNetwork.edges.map(e => ({
                source: e.from,
                target: e.to,
            })),
            ...roomNetwork.items.map((item, idx) => ({
                source: item.roomId,
                target: `item-${idx}`,
            })),
        ]
    };

    const config = {
        node: {
            size: 200,
            fontSize: 8,
            labelProperty: (node: { id: string; label: string; color: string }) => node.label,
        },
        link: {
            highlightColor: '#aaa',
        },
        width: 300,
        height: 200,
        directed: false,
        panAndZoom: false,
        nodeHighlightBehavior: false,
        staticGraph: isSingleNode,
        initialZoom: isSingleNode ? 1.5 : 1,
        initialPosition: isSingleNode ? { x: 150, y: 100 } : undefined,
    };

    return (
        <div className="w-full bg-white border rounded-md shadow p-3 text-sm space-y-2">
            {/* 네트워크 그래프 */}
            <Graph id="room-network" data={data} config={config} />

            {/* 요약 정보 */}
            <div className="flex gap-1.5 text-gray-700 font-medium">
                <div>방: {roomCount}개</div>
                <div>가구: {itemCount}개</div>
                <div>연결: {edgeCount}개</div>
            </div>
        </div>
    );
}
