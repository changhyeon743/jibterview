import { useState, useEffect } from "react";
import { Item } from "../types";
// @orchestra blueprint

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

export function useItemManagement(blueprint: any) {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    async function loadItems() {
      try {
        const itemsData = await import("../items_metadata.json");
        setItems(itemsData.default.map(convertItemData));
      } catch (error) {
        console.error("Error loading items data:", error);
      }
    }
    loadItems();
  }, []);

  const addItem = (item: Item) => {
    if (blueprint) {
      // Get room center
      const center = blueprint.model.floorplan.getCenter();

      // Create metadata with centered position
      const metadata = {
        itemName: item.itemName,
        itemType: item.itemType,
        modelURL: item.modelURL,
        position: [center.x, item.position[1], center.z], // Use room center x,z coordinates
        rotation: item.rotation,
        scale: item.scale,
        size: item.size,
        fixed: item.fixed,
        resizable: item.resizable,
        isParametric: item.isParametric,
        mesh: item.mesh,
        textures: item.textures,
      };

      blueprint.model.addItemByMetaData(metadata);
    }
  };

  return { items, addItem };
}
