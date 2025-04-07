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

  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    if (containerRef.current && !blueprint) {
      const bp = new BlueprintJS(BLUEPRINT_OPTIONS as any);

      try {
        const dataToLoad = initialData || JSON.stringify(defaultRoomJson);
        bp.model.loadSerialized(dataToLoad);
        setBlueprintData(dataToLoad);
      } catch (error) {
        const defaultData = JSON.stringify(defaultRoomJson);
        bp.model.loadSerialized(defaultData);
        setBlueprintData(defaultData);
      }

      setBlueprint(bp);
    }
  }, [initialData, blueprint, setBlueprint, setBlueprintData]);


  return { containerRef };
}
