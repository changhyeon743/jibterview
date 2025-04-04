import { useEffect, useRef, useState } from "react";
import { BlueprintJS } from "@/lib/blueprint/blueprint";
import * as default_room_json from "../empty.json";
import { BLUEPRINT_OPTIONS } from "../constants";
// @orchestra blueprint

export function useBlueprintSetup(initialData?: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [blueprint, setBlueprint] = useState<any>(null);

  useEffect(() => {
    if (containerRef.current && !blueprint) {
      console.log("Blueprint initialized");
      const bp = new BlueprintJS(BLUEPRINT_OPTIONS as any) as any;

      if (initialData) {
        try {
          bp.model.loadSerialized(initialData);
        } catch (error) {
          console.error("Failed to load initial data:", error);
          // 초기 데이터 로드 실패 시 기본 방 레이아웃 사용
          bp.model.loadSerialized(JSON.stringify(default_room_json));
        }
      } else {
        // initialData가 없으면 기본 방 레이아웃 사용
        bp.model.loadSerialized(JSON.stringify(default_room_json));
      }

      setBlueprint(bp);
    }
  }, [initialData]);

  return { containerRef, blueprint };
}
