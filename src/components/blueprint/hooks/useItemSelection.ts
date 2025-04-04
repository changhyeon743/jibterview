import { useState, useEffect } from "react";
import {
  EVENT_ITEM_SELECTED,
  EVENT_NO_ITEM_SELECTED,
} from "@/lib/blueprint/core/events";
// @orchestra blueprint

export function useItemSelection(blueprint: any) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemName, setItemName] = useState("");

  useEffect(() => {
    if (!blueprint) return;

    const handleItemSelected = (o: any) => {
      setSelectedItem(o.item);
      setItemName(o.item.name || "");
    };

    const handleNoItemSelected = () => {
      setSelectedItem(null);
      setItemName("");
    };

    blueprint.roomplanner.addEventListener(
      EVENT_ITEM_SELECTED,
      handleItemSelected,
    );
    blueprint.roomplanner.addEventListener(
      EVENT_NO_ITEM_SELECTED,
      handleNoItemSelected,
    );

    return () => {
      blueprint.roomplanner.removeEventListener(
        EVENT_ITEM_SELECTED,
        handleItemSelected,
      );
      blueprint.roomplanner.removeEventListener(
        EVENT_NO_ITEM_SELECTED,
        handleNoItemSelected,
      );
    };
  }, [blueprint]);

  const deleteItem = () => {
    if (selectedItem && blueprint) {
      blueprint.model.removeItem(selectedItem, false);
      setSelectedItem(null);
      setItemName("");
    }
  };

  return { selectedItem, setSelectedItem, itemName, setItemName, deleteItem };
}
