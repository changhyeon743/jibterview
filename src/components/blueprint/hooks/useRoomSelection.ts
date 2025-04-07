import { useState, useEffect } from "react";

import {
  EVENT_ROOM_2D_CLICKED,
  EVENT_2D_UNSELECTED,
} from "@/lib/blueprint/core/events";
// @orchestra blueprint
export function useRoomSelection(blueprint: any) {
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomName, setRoomName] = useState("");

  useEffect(() => {
    if (!blueprint) return;

    const handleRoomClicked = (evt: any) => {
      if (evt.item) {
        setSelectedRoom(evt.item);
        setRoomName(evt.item.name || "");
      } else {
        setSelectedRoom(null);
        setRoomName("");
      }
    };

    const handleUnselected = () => {
      setSelectedRoom(null);
      setRoomName("");
    };

    blueprint.floorplanner.addFloorplanListener(
      EVENT_ROOM_2D_CLICKED,
      handleRoomClicked,
    );
    blueprint.floorplanner.addFloorplanListener(
      EVENT_2D_UNSELECTED,
      handleUnselected,
    );

    return () => {
      blueprint.floorplanner.removeFloorplanListener(
        EVENT_ROOM_2D_CLICKED,
        handleRoomClicked,
      );
      blueprint.floorplanner.removeFloorplanListener(
        EVENT_2D_UNSELECTED,
        handleUnselected,
      );
    };
  }, [blueprint]);

  return { selectedRoom, roomName, setRoomName };
}
