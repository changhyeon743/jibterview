import { Vector2 } from 'three';

//@orchestra chat

const ITEM_SCALE = 0.01;

/* ────────────────────────────────────── */
/*             TYPE DEFINITIONS         */
/* ────────────────────────────────────── */

/** Blueprint 전체 구조 */
export interface Blueprint {
    floorplanner?: Floorplanner;
    items?: Item[];
}

/** 평면도 정보 */
export interface Floorplanner {
    corners: { [id: string]: Corner };
    rooms: { [cornerIds: string]: RoomMeta };
}

/** 코너(점) 정보 */
export interface Corner {
    x: number;
    y: number;
    elevation?: number;
}

/** 방 메타정보 (floorplanner.rooms) */
export interface RoomMeta {
    name?: string;
}

/** 아이템 정보 */
export interface Item {
    itemName: string;
    /** 좌표: [x, y, z, ...] (x, z를 활용하여 2D 평면 내 위치 결정) */
    position: number[];
}

/** 아이템의 단순화된 정보 */
export interface SimplifiedItem {
    name: string;
    position: string;
    relation: string;
}

/**
 * 최종 SimplifiedRoom 타입: 이름, 면적, 아이템, areaCenter에 연결된 방 이름(optional)
 * connections 배열은 "연결된 방 이름"들을 담으며, 공유 코너가 2개 이상인 경우 연결된 것으로 판단합니다.
 */
export interface SimplifiedRoom {
    name: string;
    area: number;
    items: SimplifiedItem[];
    areaCenter: { x: number; y: number };
    connections?: string[];
}

/** 최종 결과 타입 */
export interface SimplifiedRoomInfo {
    rooms: SimplifiedRoom[];
    metrics: Metrics;
    overall_character: string;
}

/** 전체 공간 메트릭 */
export interface Metrics {
    total_area: number;
    room_count: number;
    public_private_ratio: number;
    space_efficiency: string;
}

/** 방 diff 관련 타입 */
export type RoomDiff =
    | { type: 'added'; room: SimplifiedRoom }
    | { type: 'removed'; room: SimplifiedRoom }
    | { type: 'modified'; before: SimplifiedRoom; after: SimplifiedRoom };

/**
 * 내부 처리용 확장 타입: 최종 결과에 포함하지 않는 코너 ID 배열을 추가
 */
interface InternalSimplifiedRoom {
    name: string;
    area: number;
    items: SimplifiedItem[];
    areaCenter: { x: number; y: number };
    cornerIds: string[]; // 내부에서 연결 관계 계산용으로 보관
}

/* ────────────────────────────────────── */
/*         MAIN FUNCTION              */
/* ────────────────────────────────────── */

function isBlueprint(data: unknown): data is Blueprint {
    return typeof data === 'object' && data !== null && 'floorplanner' in data;
}

/**
 * 평면도 JSON 데이터를 분석하여 단순화된 공간 정보를 반환
 * @param blueprint JSON 구조의 평면도 데이터 (floorplanner와 items)
 * @returns SimplifiedRoomInfo: { rooms, metrics, overall_character }
 */
export function getSimplifiedRoomInfo(blueprint: any): SimplifiedRoomInfo {
    if (!isBlueprint(blueprint)) {
        throw new Error("유효하지 않은 blueprint 데이터입니다.");
    }

    if (!blueprint?.floorplanner) {
        return {
            rooms: [],
            metrics: { total_area: 0, room_count: 0, public_private_ratio: 0, space_efficiency: "알 수 없음" },
            overall_character: "데이터가 없습니다."
        };
    }

    const floorplan = blueprint.floorplanner;
    const blueprintItems = blueprint.items ?? [];

    // 내부 처리용으로 각 방 객체에 cornerIds를 포함해 계산
    const internalRooms: InternalSimplifiedRoom[] = Object.keys(floorplan.rooms).map(roomKey => {
        const roomMeta = floorplan.rooms[roomKey];
        const cornerIds = roomKey.split(',').map(id => id.trim());

        // 각 코너 ID에 해당하는 좌표값을 floorplan.corners에서 추출 (id 포함)
        const corners = cornerIds
            .map(id => {
                const corner = floorplan.corners[id];
                if (!corner) return null;
                return { id, x: corner.x, y: corner.y, elevation: corner.elevation };
            })
            .filter((c): c is { id: string; x: number; y: number; elevation: number | undefined } => c !== null);

        const area = calculateRoomArea(corners);
        const areaCenter = calculateCentroid(corners);
        const roomItems = blueprintItems.filter(item => isItemInRoom(item, corners));
        const items: SimplifiedItem[] = roomItems.map(item => ({
            name: getItemName(item),
            position: describeItemPosition(item, areaCenter, corners),
            relation: describeItemRelations(item, roomItems)
        }));

        return {
            name: roomMeta.name ?? "무명 공간",
            area: parseFloat(area.toFixed(1)),
            items,
            areaCenter,
            cornerIds
        };
    });

    // 연결 관계 계산: 두 방이 2개 이상의 코너를 공유하면 연결된 것으로 판단
    const finalRooms: SimplifiedRoom[] = internalRooms.map(room => {
        const connections = internalRooms
            .filter(other => other !== room)
            .filter(other => {
                const shared = room.cornerIds.filter(id => other.cornerIds.includes(id));
                return shared.length >= 2;
            })
            .map(other => other.name);
        return {
            name: room.name,
            area: room.area,
            items: room.items,
            areaCenter: room.areaCenter,
            // 연결된 방 이름 목록이 있을 경우에만 포함
            ...(connections.length > 0 && { connections })
        };
    });

    // 전체 메트릭 계산
    const metrics: Metrics = {
        total_area: calculateTotalArea(finalRooms),
        room_count: finalRooms.length,
        public_private_ratio: calculatePublicPrivateRatio(finalRooms),
        space_efficiency: calculateSpaceEfficiency(finalRooms)
    };

    const overall_character = inferOverallCharacter(finalRooms, metrics);

    return { rooms: finalRooms, metrics, overall_character };
}

/* ────────────────────────────────────── */
/*           HELPER FUNCTIONS             */
/* ────────────────────────────────────── */

/** 다각형 넓이 계산 (슈뢰더 공식) */
function calculateRoomArea(corners: { x: number; y: number }[]): number {
    if (corners.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < corners.length; i++) {
        const j = (i + 1) % corners.length;
        area += corners[i].x * corners[j].y - corners[j].x * corners[i].y;
    }
    return Math.abs(area) / 2;
}

/** 다각형 중심 (산술 평균) 계산 */
function calculateCentroid(corners: { x: number; y: number }[]): { x: number; y: number } {
    let sumX = 0, sumY = 0;
    corners.forEach(pt => {
        sumX += pt.x;
        sumY += pt.y;
    });
    return { x: sumX / corners.length, y: sumY / corners.length };
}

/** 아이템 이름 추출 (확장자 제거 및 언더스코어 제거) */
function getItemName(item: Item): string {
    const name = item.itemName || '';
    return name.split('.')[0].replace(/_/g, ' ');
}

/** 2D 평면에서 아이템 위치가 다각형 내부에 있는지 판별 */
function isItemInRoom(item: Item, corners: { x: number; y: number }[]): boolean {
    if (!item.position || !Array.isArray(item.position)) return false;
    const point = { x: item.position[0] * ITEM_SCALE, y: item.position[2] * ITEM_SCALE };
    return pointInPolygon(point, corners);
}

/** 레이캐스팅을 사용해 점이 다각형 내부에 있는지 판별 */
function pointInPolygon(point: { x: number; y: number }, corners: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const xi = corners[i].x, yi = corners[i].y;
        const xj = corners[j].x, yj = corners[j].y;
        const intersect =
            ((yi > point.y) !== (yj > point.y)) &&
            (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/** 아이템의 위치를 토대로 방 중심 및 벽과의 거리를 고려하여 설명 문자열 생성 */
function describeItemPosition(
    item: Item,
    roomCenter: { x: number; y: number },
    corners: { x: number; y: number }[]
): string {
    if (!item.position || !Array.isArray(item.position)) return '';
    const itemPos = new Vector2(item.position[0] * ITEM_SCALE, item.position[2] * ITEM_SCALE);
    const centerVec = new Vector2(roomCenter.x, roomCenter.y);
    let nearWall = false;
    const threshold = 0.5;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const wallStart = new Vector2(corners[j].x, corners[j].y);
        const wallEnd = new Vector2(corners[i].x, corners[i].y);
        const dist = distanceToLine(itemPos, wallStart, wallEnd);
        if (dist < threshold) {
            nearWall = true;
            break;
        }
    }
    let positionDesc = '';
    if (nearWall) {
        positionDesc = '벽 근처에 위치';
        const dx = itemPos.x - centerVec.x;
        const dy = itemPos.y - centerVec.y;
        positionDesc += Math.abs(dx) > Math.abs(dy)
            ? dx > 0 ? ' (오른쪽 벽)' : ' (왼쪽 벽)'
            : dy > 0 ? ' (위쪽 벽)' : ' (아래쪽 벽)';
    } else {
        const distance = itemPos.distanceTo(centerVec);
        positionDesc = distance < (calculateRoomArea(corners) * 0.1)
            ? '공간 중앙에 위치'
            : '벽에서 떨어져 있음';
    }
    return positionDesc;
}

/** 점과 선분 사이의 최단 거리 계산 */
function distanceToLine(point: Vector2, lineStart: Vector2, lineEnd: Vector2): number {
    const L2 = lineStart.distanceToSquared(lineEnd);
    if (L2 === 0) return point.distanceTo(lineStart);
    let t = ((point.x - lineStart.x) * (lineEnd.x - lineStart.x) +
        (point.y - lineStart.y) * (lineEnd.y - lineStart.y)) / L2;
    t = Math.max(0, Math.min(1, t));
    const projection = new Vector2(
        lineStart.x + t * (lineEnd.x - lineStart.x),
        lineStart.y + t * (lineEnd.y - lineStart.y)
    );
    return point.distanceTo(projection);
}

/** 동일 방 내 다른 아이템과의 관계(가장 가까운 아이템) 설명 생성 */
function describeItemRelations(item: Item, roomItems: Item[]): string {
    if (roomItems.length <= 1) return '공간 내 유일한 가구';
    const itemPos = new Vector2(item.position[0] * ITEM_SCALE, item.position[2] * ITEM_SCALE);
    const relatedItems = roomItems
        .filter(other => other !== item)
        .map(other => {
            const otherPos = new Vector2(other.position[0] * ITEM_SCALE, other.position[2] * ITEM_SCALE);
            const distance = itemPos.distanceTo(otherPos);
            return { name: getItemName(other), distance, pos: otherPos };
        })
        .sort((a, b) => a.distance - b.distance);
    if (relatedItems.length === 0) return '다른 가구와 떨어져 있음';
    const closest = relatedItems[0];
    let relation = `${closest.name}와(과) 가까이 있음`;
    const dx = closest.pos.x - itemPos.x;
    const dy = closest.pos.y - itemPos.y;
    relation += Math.abs(dx) > Math.abs(dy)
        ? dx > 0 ? ' (오른쪽에)' : ' (왼쪽에)'
        : dy > 0 ? ' (앞쪽에)' : ' (뒤쪽에)';
    return relation;
}

/** 전체 면적 계산 */
function calculateTotalArea(rooms: SimplifiedRoom[]): number {
    const total = rooms.reduce((sum, room) => sum + room.area, 0);
    return parseFloat(total.toFixed(1));
}

/** 공적/사적 공간 비율 계산 (방 이름에 특정 키워드 여부 기준) */
function calculatePublicPrivateRatio(rooms: SimplifiedRoom[]): number {
    const publicRooms = rooms.filter(room =>
        room.name.includes('거실') ||
        room.name.includes('주방') ||
        room.name.includes('다이닝')
    );
    const privateRooms = rooms.filter(room =>
        room.name.includes('침실') ||
        room.name.includes('욕실') ||
        room.name.includes('화장실')
    );
    const publicArea = publicRooms.reduce((sum, room) => sum + room.area, 0);
    const privateArea = privateRooms.reduce((sum, room) => sum + room.area, 0);
    if (privateArea === 0) return 1.0;
    return parseFloat((publicArea / privateArea).toFixed(2));
}

/** 방 평균 면적을 기반으로 공간 효율성 평가 */
function calculateSpaceEfficiency(rooms: SimplifiedRoom[]): string {
    const totalArea = calculateTotalArea(rooms);
    const roomCount = rooms.length;
    if (roomCount > 0 && totalArea > 0) {
        const avg = totalArea / roomCount;
        if (avg < 10) return "높음";
        if (avg < 15) return "중상";
        if (avg < 20) return "중간";
        if (avg < 25) return "중하";
        return "낮음";
    }
    return "알 수 없음";
}

/** 전체 공간 특성 추론 (방 개수 및 공적/사적 비율 기반) */
function inferOverallCharacter(rooms: SimplifiedRoom[], metrics: Metrics): string {
    const roomCount = rooms.length;
    let character = "";
    if (roomCount <= 2) {
        character = "소형 주거 공간";
    } else if (roomCount <= 4) {
        character = "중형 주거 공간";
    } else {
        character = "대형 주거 공간";
    }
    character += metrics.public_private_ratio > 1.0
        ? "으로, 공용 공간 중심의 개방적인 구조"
        : "으로, 개인 공간이 중시된 구조";
    return character;
}

/* ────────────────────────────────────── */
/*     DIFF ENGINE FUNCTION             */
/* ────────────────────────────────────── */

/**
 * 이전 및 이후 SimplifiedRoom 배열을 비교하여 변화(diff)를 계산
 * @param before 이전 SimplifiedRoom 배열
 * @param after 이후 SimplifiedRoom 배열
 * @returns RoomDiff[] 변화 내역 목록
 */
export function diffSimplifiedRoomInfo(
    before: SimplifiedRoom[],
    after: SimplifiedRoom[]
): RoomDiff[] {
    const diffs: RoomDiff[] = [];
    const beforeMap = new Map(before.map(room => [room.name, room]));
    const afterMap = new Map(after.map(room => [room.name, room]));
    const areaTolerance = 1.0;

    for (const [name, afterRoom] of afterMap.entries()) {
        const beforeRoom = beforeMap.get(name);
        if (!beforeRoom) {
            diffs.push({ type: 'added', room: afterRoom });
            continue;
        }
        const areaChanged = Math.abs(afterRoom.area - beforeRoom.area) > areaTolerance;
        const beforeItems = new Set(beforeRoom.items.map(i => i.name));
        const afterItems = new Set(afterRoom.items.map(i => i.name));
        const itemChanged =
            beforeItems.size !== afterItems.size ||
            [...beforeItems].some(i => !afterItems.has(i));
        if (areaChanged || itemChanged) {
            diffs.push({ type: 'modified', before: beforeRoom, after: afterRoom });
        }
    }

    for (const [name, beforeRoom] of beforeMap.entries()) {
        if (!afterMap.has(name)) {
            diffs.push({ type: 'removed', room: beforeRoom });
        }
    }
    return diffs;
}
