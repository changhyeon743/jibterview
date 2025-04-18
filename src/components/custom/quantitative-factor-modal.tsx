'use client';
//@orchestra chat

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

export interface QuantitativeFactor {
    totalArea: number;
    roomCount: number;
    livingRoomRatio: number;
    bathroomCount: number;
    storageCount: number;
    balconyCount: number;
    reason: string;
}

interface QuantitativeFactorModalProps {
    isOpen: boolean;
    onClose: () => void;
    userScenario: string;
    onFactorsGenerated: (factors: QuantitativeFactor) => void;
}

export function QuantitativeFactorModal({
                                            isOpen,
                                            onClose,
                                            userScenario,
                                            onFactorsGenerated,
                                        }: QuantitativeFactorModalProps) {
    const [scenarioText, setScenarioText] = useState(userScenario);
    const [isTyping, setIsTyping] = useState(false);
    const [factors, setFactors] = useState<QuantitativeFactor | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            setScenarioText(userScenario);
            setFactors(null);
            setError(null);
            setIsTyping(false);
        }
    }, [isOpen, userScenario]);

    const handleScenarioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setScenarioText(e.target.value);
        setIsTyping(true);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setIsTyping(false), 1000);
    };

    const generateFactors = async () => {
        setIsLoading(true);
        setError(null);
        setFactors(null);
        try {
            const res = await fetch('/api/quantitative-factors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario: scenarioText }),
            });

            if (!res.ok) throw new Error('분석 요청 실패');

            const data = await res.json();
            setFactors(data.factors);
        } catch (err) {
            setError(err instanceof Error ? err.message : '알 수 없는 오류');
            toast.error('정량 분석 실패');
        } finally {
            setIsLoading(false);
        }
    };

    const renderFactorItem = (label: string, value: any) => (
        <div key={label} className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>공간 요구 시나리오 분석</DialogTitle>
                    <DialogDescription>
                        공간에 대한 요구사항을 자유롭게 작성해 주세요.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* 시나리오 입력 */}
                    <Textarea
                        value={scenarioText}
                        onChange={handleScenarioChange}
                        rows={5}
                        className="resize-none"
                        placeholder="예: 저는 학교 근처에서 자취하고 싶은 대학생입니다. 작은 거실과 방 1개가..."
                    />

                    {/* 버튼: 입력 중이면 숨김, 입력 멈춘 뒤 1초 지나면 등장 */}
                    {!isTyping && !factors && !error && (
                        <div className="text-right transition-opacity duration-300 opacity-100">
                            <Button onClick={generateFactors} disabled={isLoading}>
                                {isLoading ? '분석 중...' : '분석 시작'}
                            </Button>
                        </div>
                    )}

                    {/* 로딩 시 */}
                    {isLoading && (
                        <div className="space-y-2">
                            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
                        </div>
                    )}

                    {/* 오류 발생 시 */}
                    {error && (
                        <div className="text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    {/* 분석 결과 표시 */}
                    {factors && (
                        <div className="space-y-1 animate-fade-in">
                            {renderFactorItem('총 면적', `${factors.totalArea}㎡`)}
                            {renderFactorItem('방 개수', factors.roomCount)}
                            {renderFactorItem('거실과 방 비율', `${Math.round(factors.livingRoomRatio * 100)}%`)}
                            {renderFactorItem('화장실 개수', factors.bathroomCount)}
                            {renderFactorItem('창고 개수', factors.storageCount)}
                            {renderFactorItem('발코니 개수', factors.balconyCount)}
                            <div className="mt-4">
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">분석 사유</div>
                                <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                    {factors.reason}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <Button variant="outline" onClick={onClose}>
                        닫기
                    </Button>
                    {factors && (
                        <Button onClick={() => onFactorsGenerated(factors)}>
                            이 구성 사용하기
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
