'use client';
// @orchestra blueprint

import { format } from 'date-fns';
import {
    ArrowDown,
    ArrowUp,
    ChevronRight,
    Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

import { LibraryItem } from './LibraryContainer';

interface LibraryTableProps {
    items: LibraryItem[];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    onSortChange: (column: string) => void;
    onUseBlueprint: (item: LibraryItem) => void;
}

export default function LibraryTable({
                                         items,
                                         sortBy,
                                         sortOrder,
                                         onSortChange,
                                         onUseBlueprint,
                                     }: LibraryTableProps) {
    const SortIcon = ({ column }: { column: string }) => {
        if (sortBy !== column) return null;
        return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    return (
        <div className="border rounded-md overflow-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead onClick={() => onSortChange('title')} className="cursor-pointer">
                            <div className="flex items-center gap-1">도면 이름 <SortIcon column="title" /></div>
                        </TableHead>
                        <TableHead onClick={() => onSortChange('floorplan_metrics.total_area')} className="cursor-pointer">
                            <div className="flex items-center gap-1">면적(㎡) <SortIcon column="floorplan_metrics.total_area" /></div>
                        </TableHead>
                        <TableHead onClick={() => onSortChange('floorplan_metrics.room_count')} className="cursor-pointer">
                            <div className="flex items-center gap-1">방 개수 <SortIcon column="floorplan_metrics.room_count" /></div>
                        </TableHead>
                        <TableHead>거실:방 비율</TableHead>
                        <TableHead>화장실 수</TableHead>
                        <TableHead>창고 수</TableHead>
                        <TableHead>발코니 수</TableHead>
                        <TableHead onClick={() => onSortChange('created_at')} className="cursor-pointer">
                            <div className="flex items-center gap-1">생성일 <SortIcon column="created_at" /></div>
                        </TableHead>
                        <TableHead className="text-right">액션</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => {
                        const metrics = item.floorplan_metrics[0] ?? {};
                        return (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.title}</TableCell>
                                <TableCell>{metrics.total_area?.toFixed(1) ?? '-'}</TableCell>
                                <TableCell>{metrics.room_count ?? '-'}</TableCell>
                                <TableCell>{(metrics.living_room_to_room_ratio * 100)?.toFixed(1) ?? '-'}%</TableCell>
                                <TableCell>{metrics.bathroom_count ?? '-'}</TableCell>
                                <TableCell>{metrics.storage_count ?? '-'}</TableCell>
                                <TableCell>{metrics.veranda_count ?? '-'}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                        <Clock size={14} />
                                        {item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd') : '-'}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onUseBlueprint(item)}
                                        className="h-8"
                                    >
                                        <span>시작하기</span>
                                        <ChevronRight size={14} className="ml-1" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
