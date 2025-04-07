"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DynamicBlueprint = dynamic(
    () => import("@/components/blueprint/Blueprint3D"),
    { ssr: false }
);

export default function Home() {
    const [inputJson, setInputJson] = useState("");
    const [error, setError] = useState("");
    const [validatedData, setValidatedData] = useState<string | null>(null);

    const validateBlueprintJson = (jsonString: string): any => {
        try {
            const parsed = JSON.parse(jsonString);

            // 필수 최상위 속성 검증
            if (!parsed.floorplanner || !parsed.items) {
                throw new Error("floorplanner와 items는 필수 속성입니다.");
            }

            // floorplanner 섹션 검증
            const floorplanner = parsed.floorplanner;
            if (!floorplanner.version || !floorplanner.corners || !floorplanner.walls) {
                throw new Error("floorplanner에는 version, corners, walls가 필요합니다.");
            }

            // corners 검증
            if (Object.keys(floorplanner.corners).length === 0) {
                throw new Error("최소 하나의 corner가 필요합니다.");
            }

            // walls 검증
            if (!Array.isArray(floorplanner.walls) || floorplanner.walls.length === 0) {
                throw new Error("최소 하나의 wall이 필요합니다.");
            }

            // items 검증
            if (!Array.isArray(parsed.items)) {
                throw new Error("items는 배열이어야 합니다.");
            }

            return parsed as any;
        } catch (e) {
            if (e instanceof SyntaxError) {
                throw new Error("올바른 JSON 형식이 아닙니다.");
            }
            throw e;
        }
    };

    const handleLoadBlueprint = () => {
        try {
            const validated = validateBlueprintJson(inputJson);
            setValidatedData(JSON.stringify(validated));
            setError("");
            setInputJson(""); // Clear input after successful load
        } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid blueprint data");
            setValidatedData(null);
        }
    };

    // If we have validated data, show the Blueprint component
    if (validatedData) {
        return (
            <main className="w-full h-main-svh">
                <DynamicBlueprint initialData={validatedData} />
            </main>
        );
    }

    // Otherwise show the input form
    return (
        <main className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">평면도 불러오기</h1>

            <div className="space-y-4">
                <Textarea
                    placeholder="여기에 Blueprint JSON을 붙여넣으세요..."
                    value={inputJson}
                    onChange={(e) => setInputJson(e.target.value)}
                    className="h-64"
                />

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex justify-end space-x-4">
                    <Button
                        onClick={handleLoadBlueprint}
                        disabled={!inputJson.trim()}
                    >
                        평면도 불러오기
                    </Button>
                </div>
            </div>
        </main>
    );
}
