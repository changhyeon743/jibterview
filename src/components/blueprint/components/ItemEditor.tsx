import React, { useState, useEffect } from "react";
import { Vector3 } from "three";
import { Physical3DItem } from "@/lib/blueprint/viewer3d/Physical3DItem";
import { ChevronUp, ChevronDown, Minimize2, Maximize2 } from "lucide-react";

//@orchestra blueprint

interface ItemEditorProps {
  selectedItem: Physical3DItem | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<Physical3DItem | null>>;
  deleteItem: () => void;
}

const SCALE_OPTIONS = [
  { label: "50%", value: 0.5 },
  { label: "75%", value: 0.75 },
  { label: "100%", value: 1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "200%", value: 2 },
];

const ItemEditor: React.FC<ItemEditorProps> = ({
                                                 selectedItem,
                                                 setSelectedItem,
                                                 deleteItem,
                                               }) => {
  const [originalSize, setOriginalSize] = useState<Vector3>(new Vector3(1, 1, 1));
  const [currentSize, setCurrentSize] = useState<Vector3>(new Vector3(1, 1, 1));
  const [itemRotationY, setItemRotationY] = useState<number>(0);
  const [itemPositionY, setItemPositionY] = useState<number>(0);

  useEffect(() => {
    if (selectedItem?.itemModel) {
      const size = selectedItem.itemModel.metadata.size;
      const vectorSize = new Vector3(size[0], size[1], size[2]);
      setOriginalSize(vectorSize);
      setCurrentSize(vectorSize.clone());
      setItemRotationY(selectedItem.itemModel.innerRotation.y);
      setItemPositionY(selectedItem.itemModel.position.y);
    }
  }, [selectedItem]);

  if (!selectedItem || !selectedItem.itemModel) {
    return null;
  }

  const handleResize = (width: number, height: number, depth: number) => {
    if (!selectedItem || !selectedItem.itemModel) return;
    const newSize = new Vector3(width, height, depth);
    selectedItem.resize(newSize);
    setCurrentSize(newSize);
  };

  const handleDimensionChange = (dimension: "x" | "y" | "z", value: number) => {
    const newSize = currentSize.clone();
    newSize[dimension] = value;
    handleResize(newSize.x, newSize.y, newSize.z);
  };

  const adjustDimension = (dimension: "x" | "y" | "z", delta: number) => {
    const newSize = currentSize.clone();
    newSize[dimension] += delta;
    handleResize(newSize.x, newSize.y, newSize.z);
  };

  const rotateItem = (angle: number) => {
    if (!selectedItem || !selectedItem.itemModel) return;
    const newAngle = selectedItem.itemModel.innerRotation.clone();
    newAngle.y += angle;
    selectedItem.rotate(newAngle);
    setItemRotationY(newAngle.y);
  };

  const moveItemY = (delta: number) => {
    if (!selectedItem || !selectedItem.itemModel) return;
    const newPosition = selectedItem.itemModel.position.clone();
    newPosition.y = itemPositionY + delta;
    selectedItem.itemModel.position = newPosition;
    setItemPositionY(newPosition.y);
  };

  const handleYPositionChange = (value: number) => {
    if (!selectedItem || !selectedItem.itemModel) return;
    const newPosition = selectedItem.itemModel.position.clone();
    newPosition.y = value;
    selectedItem.itemModel.position = newPosition;
    setItemPositionY(value);
  };

  const RotationButton: React.FC<{ angle: number; label: string }> = ({
                                                                        angle,
                                                                        label,
                                                                      }) => (
      <button
          onClick={() => rotateItem(angle)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-2 rounded-full text-xs shadow-md transition-all duration-200 ease-in-out transform hover:scale-110"
      >
        {label}
      </button>
  );

  return (
      <div className="mt-4 bg-white p-4 rounded shadow max-w-xs border border-gray-200">
        <h3 className="text-base font-bold mb-2 text-center">선택된 아이템</h3>
        <p className="text-center text-sm mb-2">{selectedItem.name}</p>

        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-700 mb-2">크기 조정</h4>
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">너비 (Width)</label>
              <div className="flex items-center gap-2">
                <button
                    onClick={() => adjustDimension("x", -currentSize.x * 0.1)}
                    className="bg-gray-200 hover:bg-gray-300 text-xs rounded px-2 py-1"
                >
                  -10%
                </button>
                <input
                    type="number"
                    value={currentSize.x}
                    onChange={(e) => handleDimensionChange("x", parseFloat(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                    step="0.1"
                />
                <button
                    onClick={() => adjustDimension("x", currentSize.x * 0.1)}
                    className="bg-gray-200 hover:bg-gray-300 text-xs rounded px-2 py-1"
                >
                  +10%
                </button>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">높이 (Height)</label>
              <div className="flex items-center gap-2">
                <button
                    onClick={() => adjustDimension("y", -currentSize.y * 0.1)}
                    className="bg-gray-200 hover:bg-gray-300 text-xs rounded px-2 py-1"
                >
                  -10%
                </button>
                <input
                    type="number"
                    value={currentSize.y}
                    onChange={(e) => handleDimensionChange("y", parseFloat(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                    step="0.1"
                />
                <button
                    onClick={() => adjustDimension("y", currentSize.y * 0.1)}
                    className="bg-gray-200 hover:bg-gray-300 text-xs rounded px-2 py-1"
                >
                  +10%
                </button>
              </div>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-600 mb-1">깊이 (Depth)</label>
              <div className="flex items-center gap-2">
                <button
                    onClick={() => adjustDimension("z", -currentSize.z * 0.1)}
                    className="bg-gray-200 hover:bg-gray-300 text-xs rounded px-2 py-1"
                >
                  -10%
                </button>
                <input
                    type="number"
                    value={currentSize.z}
                    onChange={(e) => handleDimensionChange("z", parseFloat(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                    step="0.1"
                />
                <button
                    onClick={() => adjustDimension("z", currentSize.z * 0.1)}
                    className="bg-gray-200 hover:bg-gray-300 text-xs rounded px-2 py-1"
                >
                  +10%
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 mb-2">
          <label htmlFor="item-y-position" className="block text-xs font-medium text-gray-700">
            높이 위치: {itemPositionY.toFixed(1)}
          </label>
          <div className="flex items-center space-x-2">
            <input
                type="range"
                id="item-y-position"
                min="0"
                max="300"
                step="1"
                value={itemPositionY}
                onChange={(e) => handleYPositionChange(parseFloat(e.target.value))}
                className="flex-grow"
            />
            <button
                onClick={() => moveItemY(10)}
                className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                title="위로 이동"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
                onClick={() => moveItemY(-10)}
                className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                title="아래로 이동"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex justify-between items-center">
        <span className="text-xs font-medium text-gray-700">
          회전: {itemRotationY.toFixed(2)}
        </span>
          <div className="space-x-2">
            <RotationButton angle={-Math.PI / 4} label="↺ 45°" />
            <RotationButton angle={Math.PI / 4} label="↻ 45°" />
          </div>
        </div>

        <button
            onClick={deleteItem}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm w-full"
        >
          삭제하기
        </button>
      </div>
  );
};

export default ItemEditor;
