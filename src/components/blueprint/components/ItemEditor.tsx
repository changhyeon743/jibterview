//@orchestra blueprint
import React, { useState, useEffect } from "react";
import { Vector3 } from "three";
import { Physical3DItem } from "@/lib/blueprint/viewer3d/Physical3DItem";
import { ChevronUp, ChevronDown, Minimize2, Maximize2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // shadcn/ui

interface ItemEditorProps {
  selectedItem: Physical3DItem | null;
  setSelectedItem: React.Dispatch<React.SetStateAction<Physical3DItem | null>>;
  deleteItem: () => void;
}

const ItemEditor: React.FC<ItemEditorProps> = ({
                                                 selectedItem,
                                                 setSelectedItem,
                                                 deleteItem,
                                               }) => {
  const [originalSize, setOriginalSize] = useState<Vector3>(new Vector3(1, 1, 1));
  const [currentSize, setCurrentSize] = useState<Vector3>(new Vector3(1, 1, 1));
  const [itemRotationY, setItemRotationY] = useState<number>(0);
  const [itemPositionY, setItemPositionY] = useState<number>(0);
  const [minimized, setMinimized] = useState<boolean>(true);

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

  if (!selectedItem || !selectedItem.itemModel) return null;

  const handleResize = (width: number, height: number, depth: number) => {
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
    const newAngle = selectedItem.itemModel.innerRotation.clone();
    newAngle.y += angle;
    selectedItem.rotate(newAngle);
    setItemRotationY(newAngle.y);
  };

  const moveItemY = (delta: number) => {
    const newPosition = selectedItem.itemModel.position.clone();
    newPosition.y = itemPositionY + delta;
    selectedItem.itemModel.position = newPosition;
    setItemPositionY(newPosition.y);
  };

  const handleYPositionChange = (value: number) => {
    const newPosition = selectedItem.itemModel.position.clone();
    newPosition.y = value;
    selectedItem.itemModel.position = newPosition;
    setItemPositionY(value);
  };

  const toggleMinimize = () => {
    setMinimized(!minimized);
  };

  const RotationButton: React.FC<{ angle: number; label: string }> = ({
                                                                        angle,
                                                                        label,
                                                                      }) => (
      <button
          onClick={() => rotateItem(angle)}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded-full text-[10px] shadow-sm transition-all"
      >
        {label}
      </button>
  );

  return (
      <div className={`fixed top-16 right-2 z-40 bg-white rounded-xl shadow-lg border border-gray-200 text-xs transition-all ${minimized ? 'w-auto' : 'w-[220px] sm:w-[250px] md:w-[280px]'} max-h-[90vh] sm:max-h-[80vh] p-1`}>
        {/* Header with minimize toggle */}
        <div className={`flex justify-between items-center p-2 ${minimized ? 'border-0' : 'border-b border-gray-200'}`}>
          {minimized ? (
              <p className="text-gray-700 text-[10px] truncate max-w-[100px] mr-1">{selectedItem.name}</p>
          ) : (
              <h3 className="font-bold">선택된 아이템</h3>
          )}
          <div className="flex items-center">
            {!minimized && <p className="text-gray-700 text-[10px] mr-2 truncate max-w-[150px]">{selectedItem.name}</p>}
            <button
                onClick={toggleMinimize}
                className="bg-gray-100 hover:bg-gray-200 p-1 rounded-full transition-all flex-shrink-0"
                aria-label={minimized ? "Expand" : "Minimize"}
            >
              {minimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Content area - only shown when not minimized */}
        {!minimized && (
            <div className="p-3 overflow-y-auto max-h-[calc(90vh-40px)] sm:max-h-[calc(80vh-40px)]">
              <Accordion type="multiple" className="w-full space-y-2">
                {/* 크기 조정 */}
                <AccordionItem value="size">
                  <AccordionTrigger className="py-1 text-xs">크기 조정</AccordionTrigger>
                  <AccordionContent>
                    {["x", "y", "z"].map((dim) => (
                        <div key={dim} className="mb-2">
                          <label className="block text-[10px] text-gray-600 capitalize mb-1">
                            {dim === "x" ? "너비" : dim === "y" ? "높이" : "깊이"}
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                                onClick={() =>
                                    adjustDimension(dim as "x" | "y" | "z", -currentSize[dim as "x" | "y" | "z"] * 0.1)
                                }
                                className="bg-gray-200 hover:bg-gray-300 px-1 py-0.5 rounded text-[10px]"
                            >
                              -10%
                            </button>
                            <input
                                type="number"
                                value={currentSize[dim as "x" | "y" | "z"]}
                                onChange={(e) =>
                                    handleDimensionChange(dim as "x" | "y" | "z", parseFloat(e.target.value))
                                }
                                step="0.1"
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-[10px] w-full"
                            />
                            <button
                                onClick={() =>
                                    adjustDimension(dim as "x" | "y" | "z", currentSize[dim as "x" | "y" | "z"] * 0.1)
                                }
                                className="bg-gray-200 hover:bg-gray-300 px-1 py-0.5 rounded text-[10px]"
                            >
                              +10%
                            </button>
                          </div>
                        </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                {/* 위치 */}
                <AccordionItem value="position">
                  <AccordionTrigger className="py-1 text-xs">높이 위치</AccordionTrigger>
                  <AccordionContent>
                    <label className="block mb-1 text-[10px]">
                      높이 위치: {itemPositionY.toFixed(1)}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                          type="range"
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
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                          onClick={() => moveItemY(-10)}
                          className="bg-gray-200 hover:bg-gray-300 p-1 rounded"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 회전 */}
                <AccordionItem value="rotation">
                  <AccordionTrigger className="py-1 text-xs">회전</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] font-medium text-gray-700">
                    회전: {itemRotationY.toFixed(2)}
                  </span>
                      <div className="space-x-1">
                        <RotationButton angle={-Math.PI / 4} label="↺ 45°" />
                        <RotationButton angle={Math.PI / 4} label="↻ 45°" />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* 삭제 버튼 */}
              <button
                  onClick={deleteItem}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded text-xs mt-3"
              >
                삭제하기
              </button>
            </div>
        )}
      </div>
  );
};

export default ItemEditor;
