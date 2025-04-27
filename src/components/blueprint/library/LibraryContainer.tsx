'use client';
// @orchestra blueprint

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDebounce } from 'react-use';
import { toast } from 'sonner';

import { BlueprintUploadModal } from '@/components/blueprint/BlueprintUploader';
import LibraryTable from '@/components/blueprint/library/LibraryTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlueprint } from '@/contexts/BlueprintContext';

// 도면 라이브러리 아이템 인터페이스
export interface LibraryItem {
    id: string;
    title: string;
    image_path?: string;
    created_at: string;
    user_id: string;
    is_public: boolean;
    floorplan_metrics: {
        total_area: number;
        room_count: number;
        bathroom_count: number;
        living_room_to_room_ratio: number;
        storage_count: number;
        veranda_count: number;
    }[];
}

// 페이지네이션 메타데이터 인터페이스
interface PaginationMeta {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

interface LibraryContainerProps {
    userId: string;
}

export default function LibraryContainer({ userId }: LibraryContainerProps) {
    const router = useRouter();
    const { saveBlueprintData } = useBlueprint();

    // 상태 관리
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // 페이지네이션 상태
    const [pagination, setPagination] = useState<PaginationMeta>({
        page: 1,
        pageSize: 10,
        totalCount: 0,
        totalPages: 0
    });

    // 정렬 상태
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // 검색어 디바운싱
    useDebounce(
        () => {
            setDebouncedSearchTerm(searchTerm);
        },
        500,
        [searchTerm]
    );

    // 데이터 가져오기
    const fetchLibraryItems = async () => {
        try {
            setLoading(true);
            setError(null);

            // API 요청 URL 구성
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                pageSize: pagination.pageSize.toString(),
                userId,
                sortBy,
                sortOrder,
            });

            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            const response = await fetch(`/api/library?${params.toString()}`);

            if (!response.ok) {
                throw new Error('도면 데이터를 가져오는데 실패했습니다.');
            }

            const { data, meta } = await response.json();

            setItems(data);
            setPagination(meta);
        } catch (err) {
            console.error('도면 라이브러리 조회 오류:', err);
            setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
            toast.error('도면 라이브러리를 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 검색어, 페이지, 정렬 변경시 데이터 다시 가져오기
    useEffect(() => {
        fetchLibraryItems();
    }, [debouncedSearchTerm, pagination.page, sortBy, sortOrder]);

    // 도면 사용하기 핸들러
    const handleUseBlueprint = async (item: LibraryItem) => {
        try {
            // 도면 데이터 가져오기
            const response = await fetch(`/api/blueprint-library/${item.id}`);

            if (!response.ok) {
                throw new Error('도면 데이터를 가져오는데 실패했습니다.');
            }

            const { data } = await response.json();

            if (!data || !data.blueprint_json) {
                throw new Error('도면 데이터가 없습니다.');
            }

            // 도면 데이터 저장 및 에디터로 이동
            const serializedData = JSON.stringify(data.blueprint_json);
            await saveBlueprintData(serializedData);

            // 채팅 화면으로 이동 (새 채팅)
            router.push('/');

            toast.success('도면이 적용되었습니다.');
        } catch (err) {
            console.error('도면 사용 오류:', err);
            toast.error('도면을 사용하는데 실패했습니다.');
        }
    };

    // 페이지 변경 핸들러
    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({
            ...prev,
            page: newPage
        }));
    };

    // 정렬 변경 핸들러
    const handleSortChange = (column: string) => {
        if (sortBy === column) {
            // 같은 컬럼 클릭시 오름차순/내림차순 토글
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // 다른 컬럼 클릭시 해당 컬럼으로 정렬, 기본 내림차순
            setSortBy(column);
            setSortOrder('desc');
        }
    };

    return (
        <div className="space-y-4">
            {/* 상단 도구 모음 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-1">
                    <Input
                        placeholder="도면 이름 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                    {loading && <Skeleton className="size-9 rounded-md" />}
                </div>

                <BlueprintUploadModal />
            </div>

            {/* 도면 라이브러리 테이블 */}
            {loading && items.length === 0 ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4">
                            <Skeleton className="size-12" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-[250px]" />
                                <Skeleton className="h-4 w-[200px]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-10">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={fetchLibraryItems}>다시 시도</Button>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-10 border rounded-lg">
                    <p className="text-muted-foreground mb-4">라이브러리에 도면이 없습니다.</p>
                    <BlueprintUploadModal />
                </div>
            ) : (
                <LibraryTable
                    items={items}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSortChange={handleSortChange}
                    onUseBlueprint={handleUseBlueprint}
                />
            )}

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => pagination.page > 1 && handlePageChange(pagination.page - 1)}
                                className={pagination.page === 1 ? "pointer-events-none opacity-50" : ""}
                                aria-disabled={pagination.page === 1}
                            />

                        </PaginationItem>

                        {/* 페이지 번호 */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum: number;

                            if (pagination.totalPages <= 5) {
                                // 전체 페이지가 5개 이하면 그대로 표시
                                pageNum = i + 1;
                            } else if (pagination.page <= 3) {
                                // 현재 페이지가 앞쪽이면 1~5 표시
                                pageNum = i + 1;
                            } else if (pagination.page >= pagination.totalPages - 2) {
                                // 현재 페이지가 뒤쪽이면 마지막 5개 표시
                                pageNum = pagination.totalPages - 4 + i;
                            } else {
                                // 중간이면 현재 페이지 중심으로 표시
                                pageNum = pagination.page - 2 + i;
                            }

                            return (
                                <PaginationItem key={i}>
                                    <Button
                                        variant={pagination.page === pageNum ? "default" : "outline"}
                                        onClick={() => handlePageChange(pageNum)}
                                        className="size-9"
                                    >
                                        {pageNum}
                                    </Button>
                                </PaginationItem>
                            );
                        })}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => pagination.page < pagination.totalPages && handlePageChange(pagination.page + 1)}
                                className={pagination.page === pagination.totalPages ? "pointer-events-none opacity-50" : ""}
                                aria-disabled={pagination.page === pagination.totalPages}
                            />

                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
