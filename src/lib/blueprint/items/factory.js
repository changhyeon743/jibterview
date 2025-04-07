import {PropItem} from "@/lib/blueprint/items/prop_item";

import { FloorItem } from "./floor_item.js";
import { InFloorItem } from "./in_floor_item.js";
import { InWallFloorItem } from "./in_wall_floor_item.js";
import { InWallItem } from "./in_wall_item.js";
import { Item } from "./item.js";
import { RoofItem } from "./roof_item.js";
import { WallFloorItem } from "./wall_floor_item.js";
import { WallItem } from "./wall_item.js";


// item_types에 PropItem 추가
export const item_types = {
  1: FloorItem,
  2: WallItem,
  3: InWallItem,
  7: InWallFloorItem,
  8: InFloorItem,
  9: WallFloorItem,
  0: Item,
  4: RoofItem,
  10: PropItem, // 새로운 타입으로 PropItem 추가
};

/** Factory class to create items. */
export class Factory {
  /** Gets the class for the specified item. */
  static getClass(itemType) {
    return item_types[itemType];
  }
}
