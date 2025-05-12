// src/components/blueprint/hooks/useBlueprintSetup.ts
//@orchestra blueprint
import { useEffect, useRef, useLayoutEffect } from "react";

import { useBlueprint } from "@/contexts/BlueprintContext";
import { BlueprintJS } from "@/lib/blueprint/blueprint";

import { BLUEPRINT_OPTIONS } from "../constants";
import * as defaultRoomJson from "../empty.json";

export function useBlueprintSetup() {
  // DOM 참조
  const containerRef = useRef<HTMLDivElement>(null);

  // Context에서 필요한 상태와 함수만 가져옴
  const { blueprint, setBlueprint, blueprintData, setBlueprintData } = useBlueprint();

  const isInitializedRef = useRef(false);

  useLayoutEffect(() => {
    if (isInitializedRef.current) return;
    if (!containerRef.current || blueprint) return;
    isInitializedRef.current = true;

    const bp = new BlueprintJS(BLUEPRINT_OPTIONS as any);
    const defaultData = JSON.stringify(defaultRoomJson);
    setBlueprintData(defaultData);
    setBlueprint(bp);
  }, [containerRef, blueprint, setBlueprint, setBlueprintData]);

  useEffect(() => {
    if (blueprint && blueprintData && Object.keys(blueprintData).length > 0) {
      try {
        blueprint.model.loadSerialized(blueprintData);
      } catch (error) {
        console.error("Failed to load blueprintData:", JSON.stringify(error));
      }
    }
  }, [blueprintData, blueprint]);

  return { containerRef };
}
