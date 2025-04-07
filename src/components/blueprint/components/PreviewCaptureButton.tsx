"use client"
//@orchestra blueprint

import { ImageDown, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { Box3, Vector3, OrthographicCamera } from 'three';

import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const PreviewCaptureButton = ({ blueprint }: {blueprint: any}) => {
    const [isCapturing, setIsCapturing] = useState(false);

    const captureTopView = async () => {
        if (!blueprint?.roomplanner || isCapturing) return;
        setIsCapturing(true);

        try {
            const roomplanner = blueprint.roomplanner;

            // 원본 상태 저장
            const originalState = {
                camera: {
                    position: roomplanner.camera.position.clone(),
                    zoom: roomplanner.camera.zoom,
                    isPerspective: roomplanner.camera.isPerspectiveCamera
                },
                target: roomplanner.controls.target.clone(),
                rendererSize: {
                    width: roomplanner.renderer.domElement.width,
                    height: roomplanner.renderer.domElement.height
                },
                pixelRatio: roomplanner.renderer.getPixelRatio()
            };

            // 직교 카메라로 전환
            if (originalState.camera.isPerspective) {
                roomplanner.switchCameraMode();
                // 카메라 전환 후 안정화를 위한 대기
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 공간 경계 계산
            const boundingBox = new Box3();
            let hasContent = false;

            // 바닥면 경계 계산
            roomplanner.floors3d.forEach((floor: any) => {
                if (floor.floorPlane) {
                    boundingBox.expandByObject(floor.floorPlane);
                    hasContent = true;
                }
            });

            // 아이템 경계 포함
            roomplanner.physicalRoomItems.forEach((item: any) => {
                boundingBox.expandByObject(item);
                hasContent = true;
            });

            if (!hasContent) {
                throw new Error('No content to capture');
            }

            // 경계 상자 중심과 크기 계산
            const center = new Vector3();
            boundingBox.getCenter(center);
            const size = boundingBox.getSize(new Vector3());
            const maxDim = Math.max(size.x, size.z);

            // 카메라 위치 최적화
            const height = maxDim * 2;
            const padding = maxDim * 0.1; // 10% 여백 추가

            // 렌더러 설정 최적화
            const aspectRatio = 4/3; // 일반적인 도면 비율
            const targetWidth = 3840; // 4K 해상도
            const targetHeight = targetWidth / aspectRatio;

            roomplanner.renderer.setSize(targetWidth, targetHeight);
            roomplanner.renderer.setPixelRatio(2); // 고해상도 렌더링

            // 카메라가 직교 카메라인 경우 frustum 크기 조정
            if (roomplanner.camera instanceof OrthographicCamera) {
                const frustumSize = maxDim + (padding * 2);
                roomplanner.camera.left = -frustumSize * aspectRatio / 2;
                roomplanner.camera.right = frustumSize * aspectRatio / 2;
                roomplanner.camera.top = frustumSize / 2;
                roomplanner.camera.bottom = -frustumSize / 2;
                roomplanner.camera.zoom = 1;
                roomplanner.camera.updateProjectionMatrix();
            }

            // 카메라 위치 및 방향 설정
            roomplanner.camera.position.set(center.x, height, center.z);
            roomplanner.camera.lookAt(center);
            roomplanner.controls.target.copy(center);
            roomplanner.controls.update();

            // 렌더링 사이클 확보
            roomplanner.forceRender();
            await new Promise(resolve => setTimeout(resolve, 200));
            roomplanner.forceRender(); // 더블 렌더링으로 안정성 확보

            // 캡처 및 다운로드
            const canvas = roomplanner.renderer.domElement;
            const dataUrl = canvas.toDataURL('image/png', 1.0);

            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:]/g, '-').slice(0, 19);
            link.download = `floorplan-${timestamp}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 원래 상태로 복원
            if (originalState.camera.isPerspective) {
                roomplanner.switchCameraMode();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            roomplanner.renderer.setSize(
                originalState.rendererSize.width,
                originalState.rendererSize.height
            );
            roomplanner.renderer.setPixelRatio(originalState.pixelRatio);

            roomplanner.camera.position.copy(originalState.camera.position);
            roomplanner.controls.target.copy(originalState.target);
            roomplanner.camera.zoom = originalState.camera.zoom;
            roomplanner.camera.updateProjectionMatrix();
            roomplanner.controls.update();
            roomplanner.forceRender();

        } catch (error) {
            console.error('도면 캡처 중 오류 발생:', error);
            // 사용자에게 에러 알림을 표시할 수 있습니다
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={captureTopView}
                        disabled={isCapturing}
                        className="h-8 px-2 flex items-center gap-1.5"
                    >
                        {isCapturing ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                <span className="text-xs">도면 저장중...</span>
                            </>
                        ) : (
                            <>
                                <ImageDown className="size-4" />
                                <span className="text-xs">도면 이미지</span>
                            </>
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom'>
                    <p className="text-xs">현재 도면을 고해상도 이미지로 저장</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default PreviewCaptureButton;
