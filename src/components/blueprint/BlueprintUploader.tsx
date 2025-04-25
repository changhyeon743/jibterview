'use client';
//@orchestra chat

import { FileIcon, Loader2, UploadIcon, TrashIcon, CheckCircle, XCircle } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


// 정량팩터 검토 컴포넌트
interface MetricsReviewProps {
    extractedMetrics: QuantitativeFactor | null;
    isCalculating: boolean;
    onConfirm: (approved: boolean) => void;
}

function MetricsReview({ extractedMetrics, isCalculating, onConfirm }: MetricsReviewProps) {
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

export function BlueprintUploadModal() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("upload");

    // 파일 업로드 관련 상태
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [title, setTitle] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);

    // 정량 분석 관련 상태
    const [isCalculatingMetrics, setIsCalculatingMetrics] = useState(false);
    const [extractedMetrics, setExtractedMetrics] = useState<QuantitativeFactor | null>(null);
    const [approvedMetrics, setApprovedMetrics] = useState<QuantitativeFactor | null>(null);

    // 파일 선택 핸들러
    const onDrop = useCallback((acceptedFiles: File[]) => {
        // Filter only compatible files
        const validFiles = acceptedFiles.filter(file =>
            file.type === 'application/json' ||
            file.name.endsWith('.json') ||
            file.name.endsWith('.seoulgaok')
        );

        if (validFiles.length === 0) {
            toast.error('JSON 또는 SEOULGAOK 파일만 업로드 가능합니다.');
            return;
        }

        // Use only the first valid file
        setFiles([validFiles[0]]);

        // Set default title based on filename
        const filename = validFiles[0].name.split('.')[0].replace(/_/g, ' ');
        setTitle(filename);

        // 파일이 선택되면 메트릭 리셋
        setExtractedMetrics(null);
        setApprovedMetrics(null);
    }, []);

    // Dropzone 설정
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/json': ['.json', '.seoulgaok']
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
        onDropRejected: (rejections) => {
            if (rejections.some(r => r.errors.some(e => e.code === 'file-too-large'))) {
                toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
            } else {
                toast.error('지원하지 않는 파일 형식입니다.');
            }
        }
    });

    // 파일 제거 핸들러
    const removeFile = () => {
        setFiles([]);
        setTitle('');
        setExtractedMetrics(null);
        setApprovedMetrics(null);
    };

    // 파일 유효성 검증 및 정량 요소 추출
    const analyzeFile = async (file: File): Promise<any> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    // Parse the file content to verify it's valid JSON
                    const result = event.target?.result;
                    if (typeof result === 'string') {
                        const json = JSON.parse(result);

                        // Basic validation for blueprint format
                        if (!json.floorplanner && !json.corners && !json.walls) {
                            reject(new Error('유효한 도면 파일이 아닙니다. 필수 구성 요소가 없습니다.'));
                            return;
                        }

                        // 정량 요소 추출 요청
                        try {
                            setIsCalculatingMetrics(true);
                            const response = await fetch('/api/analyze-blueprint', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ blueprintData: json })
                            });

                            if (!response.ok) {
                                throw new Error('도면 분석 중 오류가 발생했습니다.');
                            }

                            const data = await response.json();
                            setIsCalculatingMetrics(false);

                            // 분석 결과 저장
                            const metrics: QuantitativeFactor = data.metrics;
                            setExtractedMetrics(metrics);

                            // 다음 탭으로 이동
                            setActiveTab('review');

                            resolve({
                                json,
                                metrics
                            });
                        } catch (error) {
                            setIsCalculatingMetrics(false);
                            reject(new Error('도면 분석 중 오류가 발생했습니다.'));
                        }
                    } else {
                        reject(new Error('파일을 읽을 수 없습니다.'));
                    }
                } catch (error) {
                    reject(new Error('유효한 JSON 파일이 아닙니다.'));
                }
            };

            reader.onerror = () => {
                reject(new Error('파일 읽기 오류가 발생했습니다.'));
            };

            reader.readAsText(file);
        });
    };

    // 파일 분석 시작
    const handleAnalyze = async () => {
        if (files.length === 0) {
            toast.error('업로드할 파일을 선택해주세요.');
            return;
        }

        if (!title.trim()) {
            toast.error('도면 이름을 입력해주세요.');
            return;
        }

        try {
            await analyzeFile(files[0]);
        } catch (error) {
            console.error('도면 분석 에러:', error);
            toast.error(error instanceof Error ? error.message : '도면 분석 중 오류가 발생했습니다.');
        }
    };

    // 메트릭 검토 결과 처리
    const handleMetricsReview = (approved: boolean) => {
        if (approved && extractedMetrics) {
            setApprovedMetrics(extractedMetrics);
            setActiveTab('upload'); // 업로드 탭으로 이동
            toast.success('분석 결과가 승인되었습니다. 이제 도면을 업로드하세요.');
        } else {
            // 수정 모드로 전환하는 로직 (별도 구현 필요)
            toast.info('분석 결과 수정 기능은 현재 개발 중입니다.');
        }
    };

    // 최종 업로드 처리
    const handleUpload = async () => {
        if (files.length === 0) {
            toast.error('업로드할 파일을 선택해주세요.');
            return;
        }

        if (!title.trim()) {
            toast.error('도면 이름을 입력해주세요.');
            return;
        }

        if (!approvedMetrics) {
            toast.error('먼저 도면 분석을 완료해주세요.');
            return;
        }

        setUploading(true);
        setUploadProgress(10);

        try {
            const file = files[0];

            // 파일 내용 읽기
            const fileContent = await file.text();
            const blueprintJson = JSON.parse(fileContent);

            setUploadProgress(30);

            // 업로드용 FormData 생성
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', title);
            formData.append('metrics', JSON.stringify(approvedMetrics));

            setUploadProgress(50);

            // API 호출하여 업로드
            const response = await fetch('/api/blueprint-upload', {
                method: 'POST',
                body: formData,
            });

            setUploadProgress(80);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '업로드 중 오류가 발생했습니다.');
            }

            setUploadProgress(100);

            toast.success('도면이 성공적으로 업로드되었습니다!');

            // 상태 초기화 및 모달 닫기
            setFiles([]);
            setTitle('');
            setExtractedMetrics(null);
            setApprovedMetrics(null);
            setOpen(false);

        } catch (error) {
            console.error('업로드 에러:', error);
            toast.error(error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <UploadIcon className="size-4" />
                    도면 라이브러리에 업로드
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>도면 라이브러리에 업로드</DialogTitle>
                    <DialogDescription>
                        도면 파일을 업로드하고 분석 결과를 확인하세요.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="upload">도면 업로드</TabsTrigger>
                        <TabsTrigger value="review" disabled={!files.length}>분석 검토</TabsTrigger>
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
                                <input {...getInputProps()} />

                                {files.length > 0 ? (
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">선택된 파일:</p>
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                                                <div className="flex items-center gap-2">
                                                    <FileIcon className="size-4 text-blue-500" />
                                                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile();
                                                    }}
                                                >
                                                    <TrashIcon className="size-4 text-muted-foreground hover:text-destructive" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2 p-4">
                                        <UploadIcon className="size-8 text-muted-foreground mx-auto" />
                                        <p className="text-sm text-muted-foreground">
                                            파일을 여기에 드래그하거나 클릭하여 선택하세요
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            최대 10MB 크기의 JSON 또는 SEOULGAOK 파일만 지원됩니다
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Title field */}
                            <div className="space-y-2">
                                <Label htmlFor="title">도면 이름</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="도면 이름을 입력하세요"
                                />
                            </div>

                            {/* Upload progress bar (conditional) */}
                            {uploadProgress > 0 && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex justify-end gap-2">
                                {!approvedMetrics ? (
                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={files.length === 0 || !title.trim() || isCalculatingMetrics}
                                        variant="secondary"
                                    >
                                        {isCalculatingMetrics && <Loader2 className="size-4 mr-2 animate-spin" />}
                                        도면 분석하기
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="relative"
                                    >
                                        {uploading && <Loader2 className="size-4 mr-2 animate-spin" />}
                                        {uploading ? '업로드 중...' : '업로드'}
                                    </Button>
                                )}
                            </div>
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
