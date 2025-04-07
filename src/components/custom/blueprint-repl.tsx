// src/components/custom/blueprint-repl.tsx
// @orchestra blueprint
'use client';

import { AlertCircle, CheckCircle, Code, Play } from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

import { Button } from '@/components/ui/button';
import { useBlueprint } from '@/contexts/BlueprintContext';

interface BlueprintREPLProps {
    code: string;
    onExecutionComplete: (success: boolean, result?: any) => void;
}

export function BlueprintREPL({ code, onExecutionComplete }: BlueprintREPLProps) {
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);

    const { blueprint } = useBlueprint();

    const executeCode = useCallback(async () => {
        if (!blueprint || !code.trim()) return;

        setIsExecuting(true);
        setError(null);
        setResult(null);

        if (!blueprint?.model) {
            const errorMsg = 'Blueprint 모델이 설정되지 않았습니다.';
            setError(errorMsg);
            setIsExecuting(false);
            onExecutionComplete(false, { error: errorMsg });
            return;
        }

        try {
            const sandbox = {
                addItem: (metadata: any) => blueprint.model.addItemByMetaData(metadata),
                getFloorplan: () => blueprint.model.floorplan,
                console,
                setTimeout,
                clearTimeout,
                Math
            };

            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            const fn = new AsyncFunction(...Object.keys(sandbox), code);
            const executionResult = await fn(...Object.values(sandbox));

            setResult(executionResult);
            onExecutionComplete(true, {
                result: executionResult
            });
        } catch (err) {
            console.error('코드 실행 에러:', err);
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            onExecutionComplete(false, err);
        } finally {
            setIsExecuting(false);
        }
    }, [blueprint, code, onExecutionComplete]);

    useEffect(() => {
        if (code && blueprint) {
            executeCode();
        }
    }, [code, blueprint, executeCode]);

    if (!code) return null;

    return (
        <div className="rounded-md border p-4 mt-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                    <Code className="size-5 mr-2" />
                    <h3 className="text-sm font-medium">코드로 공간을 편집</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-7 px-2"
                    >
                        {isExpanded ? '접기' : '펼치기'}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={executeCode}
                        disabled={isExecuting || !code || !blueprint}
                        className="h-7 px-2"
                    >
                        <Play className="size-3 mr-1" />
                        실행
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <>
                    <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                        {code}
                    </pre>

                    <div className="mt-2">
                        {isExecuting && (
                            <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
                                <AlertCircle className="size-4 mr-1" />
                                코드 실행 중...
                            </p>
                        )}

                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                                <AlertCircle className="size-4 mr-1" />
                                오류: {error}
                            </p>
                        )}

                        {result && !error && (
                            <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
                                <CheckCircle className="size-4 mr-1" />
                                실행 완료
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
