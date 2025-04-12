import { Vector2, Vector3 } from 'three';

//@orchestra: 센티미터 단위의 아이템 좌표를 미터 단위로 변환하는 상수
const ITEM_SCALE = 0.01;

/**
 * 평면도 JSON 데이터를 분석하여 단순화된 공간 정보를 반환
 * @param blueprint JSON 구조의 평면도 데이터 (floorplanner와 items)
 * @returns { rooms, metrics, overall_character } 분석 결과 객체
 */
export function getSimplifiedRoomInfo(blueprint: any) {
    if (!blueprint?.floorplanner) {
        return { rooms: [], metrics: {}, overall_character: "데이터가 없습니다." };
    }

    const floorplan = blueprint.floorplanner;
    const blueprintItems = blueprint.items || [];

    // floorplan.rooms는 키가 콤마로 구분된 코너 ID 문자열로 구성됨
    const rooms = Object.keys(floorplan.rooms).map(roomKey => {
        const roomMeta = floorplan.rooms[roomKey];
        const cornerIds = roomKey.split(',').map(id => id.trim());

        // 각 코너 ID에 해당하는 좌표값을 floorplan.corners에서 추출 (ID 포함)
        const corners = cornerIds.map(id => {
            const corner = floorplan.corners[id];
            if (!corner) return null;
            return { id, x: corner.x, y: corner.y, elevation: corner.elevation };
        }).filter(c => c !== null);

        // 방 면적 및 중심 계산 (2D 평면: x, y)
        const area = calculateRoomArea(corners);
        const areaCenter = calculateCentroid(corners);

        // 아이템은 blueprintItems에서 해당 방의 다각형 내부에 있는지 확인
        const roomItems = blueprintItems.filter(item => isItemInRoom(item, corners));
        const items = roomItems.map(item => ({
            name: getItemName(item),
            position: describeItemPosition(item, areaCenter, corners),
            relation: describeItemRelations(item, roomItems)
        }));

        // 추후 방 연결 관계 계산을 위해 코너 ID 정보를 유지함
        const features = extractRoomFeatures(corners, area, areaCenter, floorplan);

        return {
            name: roomMeta.name || "무명 공간",
            area: parseFloat(area.toFixed(1)),
            items,
            cornerIds, // 방 연결 관계 분석에 활용
            corners,
            areaCenter,
            features
        };
    });

    // 각 방 간의 연결 관계 (공유하는 코너가 두 개 이상인 경우)
    rooms.forEach(room => {
        room.connections = findRoomConnections(room, rooms);
    });

    // 전체 공간 메트릭 계산
    const metrics = {
        total_area: calculateTotalArea(rooms),
        room_count: rooms.length,
        public_private_ratio: calculatePublicPrivateRatio(rooms),
        space_efficiency: calculateSpaceEfficiency(rooms)
    };

    const overall_character = inferOverallCharacter(rooms, metrics);

    return { rooms, metrics, overall_character };
}

/* ────────────────────────────────────── */
/*           HELPER FUNCTIONS             */
/* ────────────────────────────────────── */

//@orchestra: 방의 면적을 다각형 넓이(슈뢰더 공식)를 사용하여 계산
function calculateRoomArea(corners: any[]): number {
    if (corners.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < corners.length; i++) {
        const j = (i + 1) % corners.length;
        area += corners[i].x * corners[j].y - corners[j].x * corners[i].y;
    }
    return Math.abs(area) / 2;
}

//@orchestra: 다각형의 중심(중심점)을 계산 (산술 평균)
function calculateCentroid(corners: any[]): { x: number, y: number } {
    let sumX = 0, sumY = 0;
    for (const pt of corners) {
        sumX += pt.x;
        sumY += pt.y;
    }
    return { x: sumX / corners.length, y: sumY / corners.length };
}

//@orchestra: 아이템 이름 추출 (확장자 제거)
function getItemName(item: any): string {
    const name = item.itemName || '';
    return name.split('.')[0].replace(/_/g, ' ');
}

//@orchestra: 아이템의 (x,z)를 2D 좌표로 사용하여 방 다각형 내부 포함 여부 판별
function isItemInRoom(item: any, corners: any[]): boolean {
    if (!item.position || !Array.isArray(item.position)) return false;
    // 아이템 좌표를 센티미터에서 미터 단위로 변환: (x * ITEM_SCALE, z * ITEM_SCALE)
    const point = { x: item.position[0] * ITEM_SCALE, y: item.position[2] * ITEM_SCALE };
    return pointInPolygon(point, corners);
}

//@orchestra: 레이캐스팅 알고리즘을 사용한 점-다각형 포함 여부 판별
function pointInPolygon(point: { x: number, y: number }, corners: any[]): boolean {
    let inside = false;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
        const xi = corners[i].x, yi = corners[i].y;
        const xj = corners[j].x, yj = corners[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

//@orchestra: 아이템 위치에 대해 방 중심과 벽과의 거리를 이용하여 상대적 위치 설명 생성
function describeItemPosition(item: any, roomCenter: { x: number, y: number }, corners: any[]): string {
    if (!item.position || !Array.isArray(item.position)) return '';
    // 좌표 변환 적용: 센티미터 → 미터
    const itemPos = new Vector2(item.position[0] * ITEM_SCALE, item.position[2] * ITEM_SCALE);
    const centerVec = new Vector2(roomCenter.x, roomCenter.y);
    let nearWall = false;
    // floorplanner 좌표와 비교 시 단위가 작으므로 임계값을 0.5로 설정
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
        if (Math.abs(dx) > Math.abs(dy)) {
            positionDesc += dx > 0 ? ' (오른쪽 벽)' : ' (왼쪽 벽)';
        } else {
            positionDesc += dy > 0 ? ' (위쪽 벽)' : ' (아래쪽 벽)';
        }
    } else {
        const distance = itemPos.distanceTo(centerVec);
        // 임의 기준: 중심과의 거리가 방 면적의 10% 미만이면 중앙으로 판단
        if (distance < (calculateRoomArea(corners) * 0.1)) {
            positionDesc = '공간 중앙에 위치';
        } else {
            positionDesc = '벽에서 떨어져 있음';
        }
    }
    return positionDesc;
}

//@orchestra: 점과 선분 사이의 최단 거리 계산
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

//@orchestra: 동일 방 내 다른 아이템과의 관계(가장 가까운 아이템) 설명 생성
function describeItemRelations(item: any, roomItems: any[]): string {
    if (roomItems.length <= 1) return '공간 내 유일한 가구';
    // 좌표 변환 적용: 센티미터 → 미터
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
    if (Math.abs(dx) > Math.abs(dy)) {
        relation += dx > 0 ? ' (오른쪽에)' : ' (왼쪽에)';
    } else {
        relation += dy > 0 ? ' (앞쪽에)' : ' (뒤쪽에)';
    }
    return relation;
}

//@orchestra: 방 간의 연결 관계를, 공유 코너가 2개 이상인 경우로 판단하여 문자열 배열 반환
function findRoomConnections(room: any, rooms: any[]): string[] {
    const connections: string[] = [];
    const myCornerIds = new Set(room.cornerIds);
    rooms.forEach(other => {
        if (other === room) return;
        const otherCornerIds = new Set(other.cornerIds);
        const shared = [...myCornerIds].filter(id => otherCornerIds.has(id));
        if (shared.length >= 2) {
            connections.push(`${other.name}과 연결됨`);
        }
    });
    return connections;
}

//@orchestra: 방의 주요 특징(면적, 다각형 구조, 위치 등) 추출
function extractRoomFeatures(
    corners: any[],
    area: number,
    areaCenter: { x: number, y: number },
    floorplan: any
): string[] {
    const features: string[] = [];
    if (area < 9) {
        features.push('작은 공간');
    } else if (area > 25) {
        features.push('넓은 공간');
    }
    if (corners.length > 4) {
        features.push('다각형 구조');
    }
    // floorplan의 전체 코너 평균을 기준으로 평면도 중심 계산
    const fpCenter = getFloorplanCenter(floorplan);
    const dx = areaCenter.x - fpCenter.x;
    const dy = areaCenter.y - fpCenter.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        features.push('평면도 가장자리에 위치');
    } else {
        features.push('평면도 중앙부에 위치');
    }
    return features;
}

//@orchestra: 전체 floorplan의 중심(모든 코너의 평균) 계산
function getFloorplanCenter(floorplan: any): { x: number, y: number } {
    const cornerValues = Object.values(floorplan.corners);
    if (cornerValues.length === 0) return { x: 0, y: 0 };
    let sumX = 0, sumY = 0;
    for (const corner of cornerValues) {
        sumX += corner.x;
        sumY += corner.y;
    }
    return { x: sumX / cornerValues.length, y: sumY / cornerValues.length };
}

//@orchestra: 모든 방의 총 면적 계산
function calculateTotalArea(rooms: any[]): number {
    const total = rooms.reduce((sum, room) => sum + room.area, 0);
    return parseFloat(total.toFixed(1));
}

//@orchestra: 공적/사적 공간 비율 계산 (방 이름에 특정 키워드 포함 여부에 따라)
function calculatePublicPrivateRatio(rooms: any[]): number {
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

//@orchestra: 방 평균 면적을 기준으로 공간 효율성 평가
function calculateSpaceEfficiency(rooms: any[]): string {
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

//@orchestra: 전체 공간 특성을, 방 개수와 공적/사적 비율 등을 고려하여 추론
function inferOverallCharacter(rooms: any[], metrics: any): string {
    const roomCount = rooms.length;
    let character = "";
    if (roomCount <= 2) {
        character = "소형 주거 공간";
    } else if (roomCount <= 4) {
        character = "중형 주거 공간";
    } else {
        character = "대형 주거 공간";
    }
    if (metrics.public_private_ratio > 1.0) {
        character += "으로, 공용 공간 중심의 개방적인 구조";
    } else {
        character += "으로, 개인 공간이 중시된 구조";
    }
    return character;
}

/* ────────────────────────────────────── */
//          DIFF ENGINE FUNCTION
/* ────────────────────────────────────── */

export type SimplifiedRoom = {
    name: string;
    area: number;
    items: { name: string }[];
    cornerIds: string[];
};

export type RoomDiff =
    | { type: 'added'; room: SimplifiedRoom }
    | { type: 'removed'; room: SimplifiedRoom }
    | { type: 'modified'; before: SimplifiedRoom; after: SimplifiedRoom };

/**
 * 이전 및 이후 simplifiedRoomInfo.rooms 배열을 비교하여 변화(diff)를 계산
 * @param before 이전 simplifiedRoomInfo.rooms
 * @param after 이후 simplifiedRoomInfo.rooms
 * @returns RoomDiff[] 변화 내역 목록
 */
export function diffSimplifiedRoomInfo(
    before: SimplifiedRoom[],
    after: SimplifiedRoom[]
): RoomDiff[] {
    const diffs: RoomDiff[] = [];

    const beforeMap = new Map(before.map(room => [room.name, room]));
    const afterMap = new Map(after.map(room => [room.name, room]));

    const areaTolerance = 1.0; // ㎡ 단위 허용 오차

    // 이름 기준으로 추가 및 변경 탐지
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

    // 제거된 방 탐지
    for (const [name, beforeRoom] of beforeMap.entries()) {
        if (!afterMap.has(name)) {
            diffs.push({ type: 'removed', room: beforeRoom });
        }
    }

    return diffs;
}
