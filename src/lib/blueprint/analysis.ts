// lib/blueprint/analysis.ts

export interface RoomNode {
    id: string;            // "코너ID1,코너ID2,..." 형식의 고유 식별자
    name: string;          // 방 이름
    area: number;          // 방 면적
    cornerIds: string[];   // 방을 구성하는 코너 ID 배열
}

export interface ItemNode {
    id: string;            // 가구 고유 식별자 (itemName 또는 인덱스)
    name: string;          // 가구 이름
    roomId: string;        // 속한 방의 id
}

export interface Edge {
    from: string;          // 출발 노드(RoomNode.id)
    to: string;            // 도착 노드(RoomNode.id)
}

export interface RoomNetwork {
    rooms: RoomNode[];
    items: ItemNode[];
    edges: Edge[];
}

export function buildRoomNetwork(blueprint: any): RoomNetwork {
    const network: RoomNetwork = { rooms: [], items: [], edges: [] };
    if (!blueprint?.floorplanner) return network;

    const cornersMap: Record<string, { x: number; y: number }> = blueprint.floorplanner.corners || {};
    const roomsMeta: Record<string, { name?: string }> = blueprint.floorplanner.rooms || {};
    const units: string = blueprint.floorplanner.units || "m";

    // 단위 변환: 대부분의 모델 좌표는 cm 기준으로 되어 있고, floorplanner는 m 단위
    const itemUnitScale = units === "m" ? 1 / 100 : 1; // 1cm → 0.01m

    // 1) RoomNode 생성
    for (const roomKey of Object.keys(roomsMeta)) {
        const cornerIds = roomKey.split(',').map(id => id.trim());
        const coords = cornerIds
            .map(id => cornersMap[id])
            .filter((c): c is { x: number; y: number } => !!c)
            .map(c => ({ x: c.x, y: c.y }));

        const area = calculatePolygonArea(coords);
        network.rooms.push({
            id: roomKey,
            name: roomsMeta[roomKey].name || roomKey,
            area: parseFloat(area.toFixed(1)),
            cornerIds
        });
    }

    // 2) Room 간 엣지 생성 (공유 코너 ≥ 2)
    for (let i = 0; i < network.rooms.length; i++) {
        for (let j = i + 1; j < network.rooms.length; j++) {
            const a = network.rooms[i], b = network.rooms[j];
            const shared = a.cornerIds.filter(id => b.cornerIds.includes(id));
            if (shared.length >= 2) {
                network.edges.push({ from: a.id, to: b.id });
                network.edges.push({ from: b.id, to: a.id });
            }
        }
    }

    // 3) ItemNode 생성 (가구를 포함하는 첫 번째 방에 할당)
    const rawItems: any[] = blueprint.items || [];
    rawItems.forEach((item, idx) => {
        if (!item.position || !Array.isArray(item.position)) return;

        // position[0]: x, position[2]: z → floorplanner의 x/y (m 단위로 변환)
        const point = {
            x: item.position[0] * itemUnitScale,
            y: item.position[2] * itemUnitScale,
        };

        for (const room of network.rooms) {
            const corners = room.cornerIds
                .map(id => cornersMap[id])
                .filter((c): c is { x: number; y: number } => !!c)
                .map(c => ({ x: c.x, y: c.y }));

            if (pointInPolygon(point, corners)) {
                const rawName = typeof item.itemName === 'string' ? item.itemName : `item_${idx}`;
                const name = rawName.split('.')[0].replace(/_/g, ' ');
                network.items.push({ id: rawName, name, roomId: room.id });
                break;
            }
        }
    });

    return network;
}

/**
 * 다각형 면적 계산 (슈뢰더 공식)
 */
function calculatePolygonArea(pts: { x: number; y: number }[]): number {
    if (pts.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2;
}

/**
 * 레이캐스팅 알고리즘으로 점이 다각형 내부에 있는지 판별
 */
function pointInPolygon(
    p: { x: number; y: number },
    vs: { x: number; y: number }[]
): boolean {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i].x, yi = vs[i].y;
        const xj = vs[j].x, yj = vs[j].y;
        const intersect = ((yi > p.y) !== (yj > p.y)) &&
            (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
