"use client";

import dynamic from "next/dynamic";

import {BlueprintProvider} from "@/contexts/BlueprintContext";
const DynamicBlueprint = dynamic(
  () => import("@/components/blueprint/Blueprint3D"),
  { ssr: false },
);

export default function Home() {
  return (
    <main className="w-full h-screen">
      <h1 className="text-xs font-bold my-4">나만의 평면도 만들기 ✨</h1><DynamicBlueprint />
    </main>
  );
}
