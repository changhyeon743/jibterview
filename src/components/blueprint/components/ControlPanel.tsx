// @orchestra blueprint

import {
    Cuboid, Pencil, Move, Scissors, Trash, Download, Upload, Camera, Eye, Box
} from "lucide-react";
import React, { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { floorplannerModes } from "@/lib/blueprint/viewer2d/Viewer2D";

import PreviewCaptureButton from "./PreviewCaptureButton";

// 재사용 가능한 툴팁 버튼 컴포넌트
const TooltipButton = ({
                           icon: Icon,
                           label,
                           tooltip,
                           onClick,
                           disabled = false,
                           className = ""
                       }) => (
    <TooltipProvider delayDuration={300}>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClick}
                    disabled={disabled}
                    className={`h-8 px-2 flex items-center gap-1.5 ${className}`}
                >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{label}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom'>
                <p className="text-xs">{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

// 도구 그룹 컴포넌트
const ToolGroup = ({ children, className = "" }) => (
    <div className={`flex items-center gap-1 ${className}`}>
        {children}
    </div>
);

const ControlPanel = ({
                          blueprint,
                          selectedRoom,
                          roomName,
                          setRoomName,
                      }) => {
    const [is2DMode, setIs2DMode] = React.useState(false);
    const [isPerspective, setIsPerspective] = React.useState(false);
    const [isRealistic, setIsRealistic] = React.useState(true);
    const fileInputRef = useRef(null);

    const toggleRenderingMode = () => {
        setIsRealistic(!isRealistic);
        if (blueprint?.roomplanner) {
            blueprint.roomplanner.physicalRoomItems.forEach((item) => {
                item.realistic = !isRealistic;
            });
            blueprint.roomplanner.floors3d.forEach((item) => {
                item.realistic = !isRealistic;
            });
            // blueprint.roomplanner.edges3d.forEach((item) => {
            //     item.realistic = !isRealistic;
            // });
            blueprint.roomplanner.needsUpdate = true;
        }
    };

    const switchViewer = () => {
        blueprint?.switchView();
        setIs2DMode((prevMode) => !prevMode);
    };

    const switchCamera = () => {
        console.log("Switching camera with: ",blueprint?.roomplanner)
        if (blueprint?.roomplanner) {
            blueprint.roomplanner.switchCameraMode();
            setIsPerspective((prev) => !prev);
        }
    };

    const switchToTopView = () => {
        if (blueprint?.roomplanner) {
            blueprint.roomplanner.switchToTopView();
        }
    };

    const setViewer2DMode = (mode) => () => blueprint?.setViewer2DMode(mode);
    const deleteCurrentItem = () => blueprint?.floorplanningHelper?.deleteCurrentItem();

    // 파일 관련 기능
    const saveBlueprint3DDesign = () => {
        if (blueprint && blueprint.model) {
            const data = blueprint.model.exportSerialized();
            const a = window.document.createElement("a");
            const blob = new Blob([data], { type: "text" });
            a.href = window.URL.createObjectURL(blob);
            a.download = "design.seoulgaok";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const loadBlueprint3DDesign = (event) => {
        const file = event.target.files?.[0];
        if (file && blueprint && blueprint.model) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const data = event.target?.result;
                if (typeof data === "string") {
                    blueprint.model.loadSerialized(data);
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm shadow-lg rounded-lg border border-gray-200 p-2 z-40">
            {/* 기본 도구 그룹 */}
            <ToolGroup>
                <TooltipButton
                    icon={Cuboid}
                    label={is2DMode ? "3D" : "2D"}
                    tooltip={is2DMode ? "3D 보기로 전환" : "2D 평면도로 전환"}
                    onClick={switchViewer}
                />
                <Separator orientation="vertical" className="h-6 mx-1" />

                {!is2DMode ? (
                    // 3D 모드 도구
                    <>
                        <TooltipButton
                            icon={Camera}
                            label={isPerspective ? "투상도" : "투시도"}
                            tooltip={isPerspective ? "직교 투상도로 보기" : "원근감 있는 투시도로 보기"}
                            onClick={switchCamera}
                        />
                        <TooltipButton
                            icon={Eye}
                            label="탑뷰"
                            tooltip="위에서 내려다보는 시점으로 전환"
                            onClick={switchToTopView}
                        />
                        <TooltipButton
                            icon={Box}
                            label={isRealistic ? "실사" : "라인"}
                            tooltip={isRealistic ? "실사 렌더링 모드" : "라인 드로잉 모드"}
                            onClick={toggleRenderingMode}
                        />
                    </>
                ) : (
                    // 2D 모드 도구
                    <>
                        <TooltipButton
                            icon={Pencil}
                            label="그리기"
                            tooltip="벽체를 그리는 도구"
                            onClick={setViewer2DMode(floorplannerModes.DRAW)}
                        />
                        <TooltipButton
                            icon={Move}
                            label="이동"
                            tooltip="요소를 선택하고 이동하는 도구"
                            onClick={setViewer2DMode(floorplannerModes.MOVE)}
                        />
                        <TooltipButton
                            icon={Scissors}
                            label="변형"
                            tooltip="벽체나 공간을 수정하는 도구"
                            onClick={setViewer2DMode(floorplannerModes.EDIT_ISLANDS)}
                        />
                        <TooltipButton
                            icon={Trash}
                            label="삭제"
                            tooltip="선택한 요소를 삭제"
                            onClick={deleteCurrentItem}
                        />
                    </>
                )}

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* 파일 도구 */}
                <TooltipButton
                    icon={Download}
                    label="저장"
                    tooltip="현재 설계를 파일로 저장"
                    onClick={saveBlueprint3DDesign}
                />
                <TooltipButton
                    icon={Upload}
                    label="불러오기"
                    tooltip="저장된 설계 파일 불러오기"
                    onClick={() => (fileInputRef.current as any).click()}
                />
                {/*<PreviewCaptureButton blueprint={blueprint} />*/}
            </ToolGroup>

            {/* 2D 모드일 때 방 선택 UI */}
            {is2DMode && selectedRoom && (
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-700">방 유형:</span>
                    <Select
                        value={roomName}
                        onValueChange={(value) => {
                            setRoomName(value);
                            blueprint.floorplanningHelper.roomName = value;
                        }}
                    >
                        <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="방 선택" />
                        </SelectTrigger>
                        <SelectContent>
                            {['집안'].map((card) => (
                                <SelectItem key={card} value={card}>
                                    {card}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={loadBlueprint3DDesign}
                accept=".seoulgaok,.json"
                className="hidden"
            />
        </div>
    );
};

export default ControlPanel;
