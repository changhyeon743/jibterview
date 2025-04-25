// src/components/custom/chat-header.tsx
//@orchestra chat
'use client';

import {Grid, PlusIcon} from "lucide-react";
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/custom/model-selector';
import { SidebarToggle } from '@/components/custom/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { BetterTooltip } from '@/components/ui/tooltip';

import { useSidebar } from '../ui/sidebar';
import Link from "next/link";

export function ChatHeader({
                               selectedModelId,
                           }: {
    selectedModelId: string;
}) {
    const router = useRouter();
    const { open } = useSidebar();

    const { width: windowWidth } = useWindowSize();

    return (
        <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
            <SidebarToggle />
            {(!open || windowWidth < 768) && (
                <BetterTooltip content="New Chat">
                    <Button
                        variant="outline"
                        className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
                        onClick={() => {
                            router.push('/');
                            router.refresh();
                        }}
                    >
                        <PlusIcon />
                        <span className="md:sr-only">새로운 채팅</span>
                    </Button>
                </BetterTooltip>
            )}

            <Link href="/library">
                <Button
                    variant={'outline'}
                    className="w-full justify-start gap-2"
                >
                    <Grid size={16} />
                    <span>도면 라이브러리</span>
                </Button>
            </Link>

            <ModelSelector
                selectedModelId={selectedModelId}
                className="order-1 md:order-2"
            />
        </header>
    );
}
