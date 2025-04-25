'use client';
//@orchestra chat

import { FileIcon, Loader2, UploadIcon, TrashIcon, CheckCircle, XCircle, FileX } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
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
    DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 파일 상태 정의
type FileStatus = 'pending' | 'analyzing' | 'analyzed' | 'uploading' | 'uploaded' | 'error';

// 파일 항목 인터페이스
interface FileItem {
    file: File;
    title: string;
    status: FileStatus;
    error?: string;
    metrics?: QuantitativeFactor;
    progress: number;
    id: string; // 고유 ID
}

// 정량팩터 검토 컴포넌트
interface MetricsReviewProps {
    extractedMetrics: QuantitativeFactor | null;
    isCalculating: boolean;
    onConfirm: (approved: boolean) => void;
}

function MetricsReview({ extractedMetrics, isCalculating, onConfirm }: MetricsReviewProps) {
    // 기존 코드 유지
    if (isCalculating) {
        return (
            <div className="py-8 text-center">
                <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">도면에서 정량 요소를 분석하는 중입니다...</p>
            </div>
        );
    }

    if (!extractedMetrics) {
        return (
            <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">분석할 도면을 먼저 업로드해주세요.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium">도면에서 분석된 정량 요소</h3>
            <div className="space-y-2 p-4 bg-muted rounded-md">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">총 면적</p>
                        <p className="font-medium">{extractedMetrics.totalArea}㎡</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">방 개수</p>
                        <p className="font-medium">{extractedMetrics.roomCount}개</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">거실과 방 비율</p>
                        <p className="font-medium">{Math.round(extractedMetrics.livingRoomRatio * 100)}%</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">화장실 개수</p>
                        <p className="font-medium">{extractedMetrics.bathroomCount}개</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">창고 개수</p>
                        <p className="font-medium">{extractedMetrics.storageCount}개</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">발코니 개수</p>
                        <p className="font-medium">{extractedMetrics.balconyCount}개</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                    이 분석 결과가 정확한가요? 정확하지 않다면 수정할 수 있습니다.
                </p>
                <div className="flex justify-end space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => onConfirm(false)}
                        className="flex items-center gap-1"
                    >
                        <XCircle className="size-4" />
                        분석 수정
                    </Button>
                    <Button
                        onClick={() => onConfirm(true)}
                        className="flex items-center gap-1"
                    >
                        <CheckCircle className="size-4" />
                        분석 정확함
                    </Button>
                </div>
            </div>
        </div>
    );
}

// 파일 항목 컴포넌트
function FileListItem({
                          item,
                          onRemove,
                          onTitleChange,
                          onSelectForAnalysis
                      }: {
    item: FileItem;
    onRemove: () => void;
    onTitleChange: (title: string) => void;
    onSelectForAnalysis: () => void;
}) {
    const statusLabels: Record<FileStatus, string> = {
        pending: '대기 중',
        analyzing: '분석 중',
        analyzed: '분석 완료',
        uploading: '업로드 중',
        uploaded: '업로드 완료',
        error: '오류'
    };

    const statusIcons: Record<FileStatus, React.ReactNode> = {
        pending: <FileIcon className="size-4 text-muted-foreground" />,
        analyzing: <Loader2 className="size-4 animate-spin text-blue-500" />,
        analyzed: <CheckCircle className="size-4 text-green-500" />,
        uploading: <Loader2 className="size-4 animate-spin text-orange-500" />,
        uploaded: <CheckCircle className="size-4 text-green-500" />,
        error: <FileX className="size-4 text-red-500" />
    };

    return (
        <div className="flex items-center justify-between bg-muted p-3 rounded-md">
            <div className="flex items-center gap-3 flex-1">
                <div className="flex-shrink-0">
                    {statusIcons[item.status]}
                </div>
                <div className="flex-1 min-w-0">
                    <Input
                        value={item.title}
                        onChange={(e) => onTitleChange(e.target.value)}
                        placeholder="도면 이름"
                        className="h-8 mb-1"
                    />
                    <div className="flex items-center text-xs text-muted-foreground">
                        <span className="truncate mr-2">{item.file.name}</span>
                        <span className="text-xs font-medium">
                            {statusLabels[item.status]}
                        </span>
                    </div>
                    {item.status === 'error' && (
                        <p className="text-xs text-red-500 mt-1">{item.error}</p>
                    )}
                    {(item.status === 'uploading' || item.status === 'analyzing') && (
                        <Progress value={item.progress} className="h-1 mt-2" />
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {item.status === 'pending' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSelectForAnalysis}
                        className="h-8 px-2"
                    >
                        분석
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    disabled={item.status === 'uploading' || item.status === 'analyzing'}
                    className="h-8 w-8"
                >
                    <TrashIcon className="size-4 text-muted-foreground hover:text-destructive" />
                </Button>
            </div>
        </div>
    );
}

export function BlueprintUploadModal() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("upload");

    // 파일 목록 관리
    const [files, setFiles] = useState<FileItem[]>([]);
    const [currentFileIndex, setCurrentFileIndex] = useState<number>(-1);

    // 분석 관련 상태
    const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
    const [extractedMetrics, setExtractedMetrics] = useState<QuantitativeFactor | null>(null);

    // 파일 선택 핸들러
    const onDrop = useCallback((acceptedFiles: File[]) => {
        // 필터링: 호환되는 파일만 처리
        const validFiles = acceptedFiles.filter(file =>
            file.type === 'application/json' ||
            file.name.endsWith('.json') ||
            file.name.endsWith('.seoulgaok')
        );

        if (validFiles.length === 0) {
            toast.error('JSON 또는 SEOULGAOK 파일만 업로드 가능합니다.');
            return;
        }

        // 파일 크기 제한 확인
        const oversizedFiles = validFiles.filter(file => file.size > 10 * 1024 * 1024);
        if (oversizedFiles.length > 0) {
            toast.error(`${oversizedFiles.length}개 파일이 크기 제한(10MB)을 초과했습니다.`);
        }

        // 유효한 파일만 상태에 추가
        const validSizedFiles = validFiles.filter(file => file.size <= 10 * 1024 * 1024);
        const newFileItems = validSizedFiles.map(file => ({
            file,
            title: file.name.split('.')[0].replace(/_/g, ' '),
            status: 'pending' as FileStatus,
            progress: 0,
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));

        setFiles(prev => [...prev, ...newFileItems]);
    }, []);

    // Dropzone 설정
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/json': ['.json', '.seoulgaok']
        },
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    // 파일 제거 핸들러
    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(item => item.id !== id));
    };

    // 파일 제목 변경 핸들러
    const updateFileTitle = (id: string, title: string) => {
        setFiles(prev =>
            prev.map(item =>
                item.id === id ? { ...item, title } : item
            )
        );
    };

    // 파일 분석 선택 핸들러
    const selectFileForAnalysis = (index: number) => {
        setCurrentFileIndex(index);
        analyzeFile(files[index]);
    };

    // 파일 유효성 검증 및 정량 요소 추출
    const analyzeFile = async (fileItem: FileItem) => {
        // 파일 상태 업데이트
        updateFileStatus(fileItem.id, 'analyzing', 10);
        setIsCalculatingMetrics(true);
        setExtractedMetrics(null);

        try {
            // 파일 읽기
            const fileContent = await readFileAsText(fileItem.file);
            updateFileStatus(fileItem.id, 'analyzing', 30);

            // JSON 파싱
            let json;
            try {
                json = JSON.parse(fileContent);
            } catch (error) {
                throw new Error('유효한 JSON 파일이 아닙니다.');
            }

            // 기본 검증
            if (!json.floorplanner && !json.corners && !json.walls) {
                throw new Error('유효한 도면 파일이 아닙니다. 필수 구성 요소가 없습니다.');
            }

            updateFileStatus(fileItem.id, 'analyzing', 50);

            // 정량 요소 추출 요청
            const response = await fetch('/api/analyze-blueprint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blueprintData: json })
            });

            if (!response.ok) {
                throw new Error('도면 분석 중 오류가 발생했습니다.');
            }

            updateFileStatus(fileItem.id, 'analyzing', 80);
            const data = await response.json();

            // 분석 완료
            const metrics: QuantitativeFactor = data.metrics;
            setExtractedMetrics(metrics);
            updateFileStatus(fileItem.id, 'analyzed', 100, undefined, metrics);

            // 다음 탭으로 이동
            setActiveTab('review');

        } catch (error) {
            console.error('도면 분석 에러:', error);
            updateFileStatus(
                fileItem.id,
                'error',
                0,
                error instanceof Error ? error.message : '도면 분석 중 오류가 발생했습니다.'
            );
            toast.error(error instanceof Error ? error.message : '도면 분석 중 오류가 발생했습니다.');
        } finally {
            setIsCalculatingMetrics(false);
        }
    };

    // 파일 상태 업데이트 헬퍼 함수
    const updateFileStatus = (
        id: string,
        status: FileStatus,
        progress: number = 0,
        error?: string,
        metrics?: QuantitativeFactor
    ) => {
        setFiles(prev =>
            prev.map(item =>
                item.id === id
                    ? {
                        ...item,
                        status,
                        progress,
                        ...(error !== undefined && { error }),
                        ...(metrics !== undefined && { metrics })
                    }
                    : item
            )
        );
    };

    // 텍스트로 파일 읽기 헬퍼 함수
    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('파일 읽기 오류가 발생했습니다.'));
            reader.readAsText(file);
        });
    };

    // 메트릭 검토 결과 처리
    const handleMetricsReview = (approved: boolean) => {
        if (currentFileIndex < 0 || currentFileIndex >= files.length) return;

        if (approved && extractedMetrics) {
            // 현재 파일에 메트릭스 연결
            updateFileStatus(
                files[currentFileIndex].id,
                'analyzed',
                100,
                undefined,
                extractedMetrics
            );

            setActiveTab('upload'); // 업로드 탭으로 이동
            toast.success('분석 결과가 승인되었습니다. 업로드 준비가 완료되었습니다.');
        } else {
            // 수정 모드로 전환하는 로직 (별도 구현 필요)
            toast.info('분석 결과 수정 기능은 현재 개발 중입니다.');
        }
    };

    // 전체 파일 순차 업로드 처리
    const uploadAllFiles = async () => {
        const filesToUpload = files.filter(f => f.status === 'analyzed' && f.metrics);

        if (filesToUpload.length === 0) {
            toast.error('업로드할 준비가 된 파일이 없습니다. 먼저 파일을 분석해주세요.');
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        // 순차적으로 파일 업로드
        for (let i = 0; i < filesToUpload.length; i++) {
            const fileItem = filesToUpload[i];

            try {
                // 업로드 상태로 변경
                updateFileStatus(fileItem.id, 'uploading', 0);

                // FormData 생성
                const formData = new FormData();
                formData.append('file', fileItem.file);
                formData.append('title', fileItem.title || fileItem.file.name.split('.')[0]);
                formData.append('metrics', JSON.stringify(fileItem.metrics));

                // 업로드 진행상황 시뮬레이션
                updateFileStatus(fileItem.id, 'uploading', 30);

                // API 호출
                const response = await fetch('/api/blueprint-upload', {
                    method: 'POST',
                    body: formData,
                });

                updateFileStatus(fileItem.id, 'uploading', 70);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '업로드 중 오류가 발생했습니다.');
                }

                // 업로드 완료
                updateFileStatus(fileItem.id, 'uploaded', 100);
                successCount++;

            } catch (error) {
                console.error('업로드 에러:', error);
                updateFileStatus(
                    fileItem.id,
                    'error',
                    0,
                    error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.'
                );
                errorCount++;
            }
        }

        // 완료 메시지
        if (successCount > 0) {
            toast.success(`${successCount}개 파일 업로드 완료${errorCount > 0 ? `, ${errorCount}개 실패` : ''}`);
        } else if (errorCount > 0) {
            toast.error(`모든 파일 업로드 실패 (${errorCount}개)`);
        }
    };

    // 파일이 모두 업로드되었는지 확인
    const areAllFilesUploaded = files.length > 0 &&
        files.every(f => f.status === 'uploaded' || f.status === 'error');

    // 모든 파일이 분석 완료되었는지 확인
    const areAllFilesAnalyzed = files.length > 0 &&
        files.every(f => f.status === 'analyzed' || f.status === 'uploaded' || f.status === 'error');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <UploadIcon className="size-4" />
                    도면 라이브러리에 업로드
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>도면 라이브러리에 업로드</DialogTitle>
                    <DialogDescription>
                        도면 파일을 업로드하고 분석 결과를 확인하세요. 여러 파일을 한번에 처리할 수 있습니다.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">도면 업로드</TabsTrigger>
                        <TabsTrigger value="review" disabled={currentFileIndex < 0 || !files[currentFileIndex]?.file}>분석 검토</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="py-2">
                        <div className="space-y-4">
                            {/* Dropzone */}
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-lg p-6 cursor-pointer text-center transition-colors ${
                                    isDragActive
                                        ? 'border-primary bg-primary/5'
                                        : 'border-muted-foreground/25 hover:border-primary/50'
                                }`}
                            >
                                <input {...getInputProps()} multiple />
                                <div className="space-y-2 p-4">
                                    <UploadIcon className="size-8 text-muted-foreground mx-auto" />
                                    <p className="text-sm text-muted-foreground">
                                        파일을 여기에 드래그하거나 클릭하여 선택하세요
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        최대 10MB 크기의 JSON 또는 SEOULGAOK 파일만 지원됩니다
                                    </p>
                                </div>
                            </div>

                            {/* 파일 목록 */}
                            {files.length > 0 && (
                                <div className="space-y-3 max-h-64 overflow-y-auto p-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-medium">선택된 파일 ({files.length})</h3>
                                        <div className="space-x-2">
                                            {files.some(f => f.status === 'analyzed') && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={uploadAllFiles}
                                                    disabled={files.some(f => f.status === 'uploading')}
                                                >
                                                    모두 업로드
                                                </Button>
                                            )}
                                            {areAllFilesUploaded && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setOpen(false)}
                                                >
                                                    완료
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    {files.map((fileItem, index) => (
                                        <FileListItem
                                            key={fileItem.id}
                                            item={fileItem}
                                            onRemove={() => removeFile(fileItem.id)}
                                            onTitleChange={(title) => updateFileTitle(fileItem.id, title)}
                                            onSelectForAnalysis={() => selectFileForAnalysis(index)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* 업로드 진행 상태 */}
                            {files.some(f => f.status === 'uploading') && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>업로드 진행 중...</span>
                                        <span>
                                            {files.filter(f => f.status === 'uploaded').length} / {files.length}
                                        </span>
                                    </div>
                                    <Progress
                                        value={(files.filter(f => f.status === 'uploaded').length / files.length) * 100}
                                        className="h-1"
                                    />
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="review">
                        <MetricsReview
                            extractedMetrics={extractedMetrics}
                            isCalculating={isCalculatingMetrics}
                            onConfirm={handleMetricsReview}
                        />
                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                    >
                        닫기
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
