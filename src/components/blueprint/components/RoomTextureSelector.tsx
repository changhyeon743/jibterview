"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import * as wall_textures from "../wall_textures.json";
import * as floor_textures from "../floor_textures.json";
import { Texture } from "@/components/blueprint/types";
import {
  EVENT_NO_ITEM_SELECTED,
  EVENT_ROOM_CLICKED,
  EVENT_WALL_CLICKED,
} from "@/lib/blueprint/core/events";
// @orchestra blueprint

interface RoomTextureSelectorProps {
  blueprint: any;
}
interface Color {
  name: string;
  value: string;
}

interface TextureThumbnail {
  name: string;
  thumbnail: string;
  textures: Texture;
}

const RoomTextureSelector: React.FC<RoomTextureSelectorProps> = ({
  blueprint,
}) => {
  const [activeMode, setActiveMode] = useState<"wall" | "ground" | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (blueprint && blueprint.roomplanningHelper) {
      const wallClickHandler = () => {
        setActiveMode("wall");
        setIsVisible(true);
      };

      const roomClickHandler = () => {
        setActiveMode("ground");
        setIsVisible(true);
      };

      const noItemSelectedHandler = () => {
        setIsVisible(false);
      };
      blueprint.roomplanner.addEventListener(
        EVENT_WALL_CLICKED,
        wallClickHandler,
      );
      blueprint.roomplanner.addEventListener(
        EVENT_ROOM_CLICKED,
        roomClickHandler,
      );
      blueprint.roomplanner.addEventListener(
        EVENT_NO_ITEM_SELECTED,
        noItemSelectedHandler,
      );

      return () => {
        blueprint.roomplanner.removeEventListener(
          EVENT_WALL_CLICKED,
          wallClickHandler,
        );
        blueprint.roomplanner.removeEventListener(
          EVENT_ROOM_CLICKED,
          roomClickHandler,
        );
        blueprint.roomplanner.removeEventListener(
          EVENT_NO_ITEM_SELECTED,
          noItemSelectedHandler,
        );
      };
    }
  }, [blueprint]);

  const wallTextures: any[] = Object.entries(wall_textures).map(
    ([name, textures]) => ({
      name: name.replace(/_/g, " ").replace(/-/g, " "),
      thumbnail: textures.colormap,
      textures: textures,
    }),
  );

  const groundTextures: any[] = Object.entries(floor_textures).map(
    ([name, textures]) => ({
      name: name.replace(/_/g, " ").replace(/-/g, " "),
      thumbnail: textures.colormap,
      textures: textures,
    }),
  );

  const colors: Color[] = [
    { name: "White", value: "#FFFFFF" },
    { name: "Beige", value: "#F5F5DC" },
    { name: "Light Gray", value: "#D3D3D3" },
    { name: "Sky Blue", value: "#87CEEB" },
    { name: "Mint Green", value: "#98FF98" },
  ];

  const changeTexture = (texture: Texture) => {
    if (blueprint && blueprint.roomplanningHelper) {
      if (activeMode === "wall") {
        blueprint.roomplanningHelper.wallTexturePack = texture;
      } else if (activeMode === "ground") {
        blueprint.roomplanningHelper.roomTexturePack = texture;
      }
    }
  };

  const changeColor = (color: string) => {
    if (blueprint && blueprint.roomplanningHelper) {
      if (activeMode === "wall") {
        blueprint.roomplanningHelper.setWallColor(color);
      } else if (activeMode === "ground") {
        blueprint.roomplanningHelper.setRoomFloorColor(color);
      }
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="z-40 absolute top-24 right-4 bg-white p-2 rounded shadow w-64 border border-gray-200 overflow-hidden">
      <h3 className="text-sm font-bold mb-1 text-center"></h3>
      <div className="mb-2 max-h-40 overflow-y-auto">
        <h4 className="text-xs font-semibold mb-1">Textures</h4>
        <div className="flex flex-wrap gap-1 justify-center">
          {(activeMode === "wall" ? wallTextures : groundTextures).map(
            (texture, index) => (
              <button
                key={index}
                onClick={() => changeTexture(texture.textures)}
                className="flex flex-col items-center bg-gray-100 hover:bg-gray-200 rounded p-1"
              >
                <Image
                  src={texture.thumbnail}
                  alt={texture.name}
                  width={30}
                  height={30}
                  className="rounded"
                />
                <span className="mt-1 text-xs">{texture.name}</span>
              </button>
            ),
          )}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold mb-1">Colors</h4>
        <div className="flex flex-wrap gap-1 justify-center">
          {colors.map((color, index) => (
            <button
              key={index}
              onClick={() => changeColor(color.value)}
              className="w-6 h-6 rounded-full border border-gray-300"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomTextureSelector;
