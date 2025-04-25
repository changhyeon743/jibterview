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
    const cookieStore = await cookies();
    const isCollapsed = cookieStore.get('sidebar:state')?.value !== 'true';

    const user = await getSession();

    return (
        <SidebarProvider defaultOpen={!isCollapsed}>
            <BlueprintProvider>
                <AppSidebar user={user} />
                <SidebarInset className='p-4 px-8'>{children}</SidebarInset>
            </BlueprintProvider>
        </SidebarProvider>
    );
}
