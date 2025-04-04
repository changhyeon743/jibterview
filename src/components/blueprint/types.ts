// @orchestra blueprint
export interface Texture {
  name: string;
  texture: string;
  color: string;
  shininess: number;
  size: number[];
}

export interface Item {
  id: string;
  itemName: string;
  itemType: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  size: [number, number, number];
  fixed: boolean;
  resizable: boolean;
  modelURL: string;
  isParametric: boolean;
  mesh: string[];
  textures: Texture[];
}
