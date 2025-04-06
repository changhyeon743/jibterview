//@orchestra chat
import { cookies } from 'next/headers';

import { AppSidebar } from '@/components/custom/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BlueprintProvider } from '@/contexts/BlueprintContext';
import { getSession } from '@/db/cached-queries';

export default async function Layout({
                                         children,
                                     }: {
    children: React.ReactNode;
}) {
    return (
            <BlueprintProvider>
                {children}
            </BlueprintProvider>
    );
}
