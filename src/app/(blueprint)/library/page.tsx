// src/app/(blueprint)/library/page.tsx
//@orchestra blueprint

import LibraryContainer from '@/components/blueprint/library/LibraryContainer';
import {SidebarToggle} from "@/components/custom/sidebar-toggle";
import { getSession } from '@/db/cached-queries';

export default async function LibraryPage() {
    const user = await getSession();

    // 사용자 인증 확인
    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-lg">로그인이 필요한 서비스입니다.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">도면 라이브러리</h1>
                <p className="text-muted-foreground">
                    저장된 도면을 찾아보거나 새로운 도면을 업로드하여 AI와 함께 공간을 계획해보세요.
                </p>
            </div>
            <LibraryContainer userId={user.id} />
        </div>
    );
}
