// src/components/blueprint/hooks/useItemManagement.ts
import { useState, useEffect } from "react";

import { useBlueprint } from "@/contexts/BlueprintContext";

import { Item } from "../types";

// 아이템 데이터 변환 함수
function convertItemData(data: any): Item {
  return {
    id: data.id,
    itemName: data.itemName,
    itemType: data.itemType,
    position: data.position,
    rotation: data.rotation,
    scale: data.scale,
    size: data.size,
    fixed: data.fixed,
    resizable: data.resizable,
    modelURL: data.modelURL,
    isParametric: data.isParametric,
    mesh: data.mesh,
    textures: data.textures,
  };
}

// 아이템 관리 훅 - 단순화된 버전
export function useItemManagement() {
  // 아이템 목록 상태
  const [items, setItems] = useState<Item[]>([]);

  // Context에서 addItem 함수 가져오기
  const { addItem: contextAddItem, blueprint } = useBlueprint();

  // 아이템 메타데이터 로드
  useEffect(() => {
    async function loadItems() {
      try {
        const itemsData = await import("../items_metadata.json");
        setItems(itemsData.default.map(convertItemData));
      } catch (error) {
        console.error("아이템 데이터 로드 실패:", error);
      }
    }
    loadItems();
  }, []);

  // 아이템 추가 래퍼 함수
  const addItem = (item: Item) => {
    if (!blueprint) {
      console.error("Blueprint 인스턴스가 없습니다");
      return;
    }

    // 방 중앙 위치 계산
    const center = blueprint.model.floorplan.getCenter();

    // 메타데이터 생성 - 중앙 위치 사용
    const metadata = {
      itemName: item.itemName,
      itemType: item.itemType,
      modelURL: item.modelURL,
      position: [center.x, item.position[1], center.z], // 중앙 x,z 좌표 사용
      rotation: item.rotation,
      scale: item.scale,
      size: item.size,
      fixed: item.fixed,
      resizable: item.resizable,
      isParametric: item.isParametric,
      mesh: item.mesh,
      textures: item.textures,
    };

    // Context의 addItem 함수 호출
    contextAddItem(metadata);
  };

  return { items, addItem };
}
