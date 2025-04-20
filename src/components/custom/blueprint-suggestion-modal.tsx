'use client';
//@orchestra chat

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { QuantitativeFactor } from '@/components/custom/quantitative-factor-modal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';

// 추천 도면 데이터 인터페이스
export interface BlueprintSuggestion {
    id: string;
    title: string;
    description: string;
    matchScore: number; // 정량 요소와의 일치도 (0-100%)
    previewImageUrl?: string;
    serializedData: string;
}

interface BlueprintSuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    quantitativeFactors: QuantitativeFactor;
    onBlueprintSelected: (blueprint: BlueprintSuggestion) => void;
}

export function BlueprintSuggestionModal({
                                             isOpen,
                                             onClose,
                                             quantitativeFactors,
                                             onBlueprintSelected,
                                         }: BlueprintSuggestionModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<BlueprintSuggestion[]>([]);
    const [selectedBlueprintId, setSelectedBlueprintId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 모달이 열릴 때 도면 추천 요청
        if (isOpen && quantitativeFactors && !suggestions.length && !isLoading) {
            fetchBlueprintSuggestions();
        }
    }, [isOpen, quantitativeFactors]);

    // 모달이 닫힐 때 상태 초기화
    useEffect(() => {
        if (!isOpen) {
            setSuggestions([]);
            setSelectedBlueprintId(null);
            setError(null);
        }
    }, [isOpen]);

    const fetchBlueprintSuggestions = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/blueprint-suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ factors: quantitativeFactors }),
            });

            if (!response.ok) {
                throw new Error('도면 추천을 가져오는 데 실패했습니다.');
            }

            const data = await response.json();
            setSuggestions(data.suggestions);

            // 가장 일치도가 높은 도면 자동 선택
            if (data.suggestions.length > 0) {
                const bestMatch = data.suggestions.reduce(
                    (prev: BlueprintSuggestion, current: BlueprintSuggestion) =>
                        prev.matchScore > current.matchScore ? prev : current
                );
                setSelectedBlueprintId(bestMatch.id);
            }
        } catch (err) {
            console.error('Error fetching blueprint suggestions:', err);
            setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
            toast.error('도면 추천을 가져오는 데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirm = () => {
        if (selectedBlueprintId) {
            const selectedBlueprint = suggestions.find(bp => bp.id === selectedBlueprintId);
            if (selectedBlueprint) {
                onBlueprintSelected(selectedBlueprint);
                onClose();
            }
        }
    };

    const handleCreateNew = () => {
        // 새 도면 생성 시 빈 도면 데이터 전달
        onBlueprintSelected({
            id: 'new',
            title: '새 도면',
            description: '사용자 요구사항에 맞춘 빈 도면',
            matchScore: 100,
            serializedData: JSON.stringify({
                floorplanner: {
                    corners: {},
                    walls: [],
                    rooms: {}
                },
                items: []
            })
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>추천 도면</DialogTitle>
                    <DialogDescription>
                        요구사항에 맞는 도면 템플릿을 선택하거나 새 도면을 생성하세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full rounded-lg" />
                            <Skeleton className="h-24 w-full rounded-lg" />
                            <Skeleton className="h-24 w-full rounded-lg" />
                        </div>
                    ) : error ? (
                        <div className="text-red-500 text-sm py-2">
                            {error}
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={fetchBlueprintSuggestions}
                            >
                                다시 시도
                            </Button>
                        </div>
                    ) : suggestions.length > 0 ? (
                        <RadioGroup
                            value={selectedBlueprintId || undefined}
                            onValueChange={setSelectedBlueprintId}
                            className="space-y-3"
                        >
                            {suggestions.map((suggestion) => (
                                <label
                                    key={suggestion.id}
                                    htmlFor={suggestion.id}
                                    className={`flex items-start space-x-3 border p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                                        selectedBlueprintId === suggestion.id ? 'border-primary bg-primary/5' : 'border-muted'
                                    }`}
                                >
                                    <RadioGroupItem value={suggestion.id} id={suggestion.id} className="mt-1" />
                                    <div className="grid md:grid-cols-4 gap-2 flex-1">
                                        {suggestion.previewImageUrl && (
                                            <div className="aspect-video md:col-span-1 bg-muted overflow-hidden rounded-md">
                                                <img
                                                    src={suggestion.previewImageUrl}
                                                    alt={suggestion.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className={suggestion.previewImageUrl ? "md:col-span-3" : "md:col-span-4"}>
                                            <div className="flex justify-between">
                                                <h3 className="font-medium text-sm">{suggestion.title}</h3>
                                                <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                          일치도 {suggestion.matchScore}%
                        </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </RadioGroup>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">추천 도면이 없습니다.</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <Button
                        variant="outline"
                        onClick={handleCreateNew}
                        className="min-w-24"
                    >
                        새 도면 생성
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            취소
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isLoading || !selectedBlueprintId}
                            className="min-w-24"
                        >
                            {isLoading ? '로딩 중...' : '선택'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
