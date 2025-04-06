// src/components/blueprint/hooks/useBlueprintSetup.ts
import { useEffect, useRef } from "react";

import { useBlueprint } from "@/contexts/BlueprintContext";
import { BlueprintJS } from "@/lib/blueprint/blueprint";

import { BLUEPRINT_OPTIONS } from "../constants";
import * as defaultRoomJson from "../empty.json";

export function useBlueprintSetup(initialData?: string) {
  // DOM 참조
  const containerRef = useRef<HTMLDivElement>(null);

  // Context에서 필요한 상태와 함수만 가져옴
  const { blueprint, setBlueprint, setBlueprintData } = useBlueprint();

  // Blueprint 초기화 - 한 번만 실행
  useEffect(() => {
    console.log("Blueprint 초기화0");
    // 이미 blueprint가 있으면 초기화 생략
    if (containerRef.current && !blueprint) {
      console.log("Blueprint 초기화");

      // BlueprintJS 인스턴스 생성
      const bp = new BlueprintJS(BLUEPRINT_OPTIONS as any);

      // 초기 데이터 로드
      try {
        console.log("초기화 성공", bp)
        const dataToLoad = initialData || JSON.stringify(defaultRoomJson);
        bp.model.loadSerialized(dataToLoad);
        setBlueprintData(dataToLoad);
      } catch (error) {
        console.error("초기 데이터 로드 실패:", error);
        // 오류 시 기본 데이터 사용
        const defaultData = JSON.stringify(defaultRoomJson);
        bp.model.loadSerialized(defaultData);
        setBlueprintData(defaultData);
      }
      // Context에 blueprint 인스턴스 설정
      setBlueprint(bp);
      console.log("blueprint 설정",bp)
    }
  }, [initialData]);

  return { containerRef };
}
