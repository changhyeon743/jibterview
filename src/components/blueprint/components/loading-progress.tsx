import React, { useEffect, useState } from 'react';

const LoadingProgress = ({ progress, isLoading }) => {
    // 부드러운 애니메이션을 위한 현재 표시 진행도 상태
    const [displayProgress, setDisplayProgress] = useState(0);
    // 로딩바 표시 상태 (투명도 애니메이션용)
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isLoading) {
            setIsVisible(true);
        } else {
            // 로딩이 완료되면 진행바를 100%까지 채운 후 천천히 사라지게 함
            setDisplayProgress(100);
            const timeout = setTimeout(() => {
                setIsVisible(false);
            }, 1000); // 1초 후 페이드 아웃 시작
            return () => clearTimeout(timeout);
        }
    }, [isLoading]);

    useEffect(() => {
        // 진행도를 부드럽게 업데이트
        const animationFrame = requestAnimationFrame(() => {
            setDisplayProgress(current => {
                const diff = progress - current;
                return current + diff * 0.1; // 현재값과 목표값의 차이를 10%씩 줄임
            });
        });
        return () => cancelAnimationFrame(animationFrame);
    }, [progress]);

    return (
        <div
            className={`absolute bottom-0 left-0 right-0 z-50 transition-opacity duration-1000 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
        >
            {/* 전체 로딩바 컨테이너 */}
            <div className="h-1 bg-gray-200">
                {/* 실제 진행도를 나타내는 부분 */}
                <div
                    className="h-full bg-blue-500 transition-all duration-300 ease-out"
                    style={{
                        width: `${displayProgress}%`,
                        // 그라데이션 효과 추가
                        background: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%)',
                        // 진행 표시줄 끝부분에 빛나는 효과 추가
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                    }}
                />
            </div>
        </div>
    );
};

export default LoadingProgress;
