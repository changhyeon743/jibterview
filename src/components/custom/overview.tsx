'use client';

import {motion} from 'framer-motion';

export const Overview = () => {
    return (
        <motion.div
            key="overview"
            className="max-w-3xl mx-auto md:mt-10"
            initial={{opacity: 0, scale: 0.98}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.98}}
            transition={{delay: 0.5}}
        >
            <div
                className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-3xl text-muted-foreground">
                <p className="text-xl font-semibold text-foreground">
                    당신이 꿈꾸는 집은 어떤 모습인가요?
                    <br/>
                    활기찬 하루를 마친 뒤, 편히 쉴 수 있는 조용한 공간일 수도 있고,
                    <br/>
                    소중한 사람들과 함께 웃고 떠들 수 있는 따뜻한 장소일 수도 있어요.
                </p>

                <p>
                    우리는 흔히 집을 고를 때 <strong className="text-foreground">면적</strong>, <strong
                    className="text-foreground">가격</strong>,
                    <strong className="text-foreground">위치</strong> 같은 숫자를 먼저 떠올립니다.
                    <br/>
                    하지만 그 안에서 <em>어떻게 살아가고 싶은지</em>는 숫자로만 설명할 수 없죠.
                </p>

                <p>
                    지금, 당신의 생활 이야기를 들려주세요.
                    <br/>
                    혹은 아래의 <strong className="text-foreground">시나리오 중 하나를 선택</strong>해도 좋아요.
                    <br/>
                    AI가 그 이야기를 읽고, 어울리는 공간을 정량화하여 제안해드립니다.
                </p>

                <p>
                    제안된 공간은 끝이 아닙니다.
                    <br/>
                    당신은 <strong className="text-foreground">가구를 배치하거나 레이아웃을 직접 조정</strong>하며,
                    <br/>
                    삶에 맞는 집을 함께 만들어갈 수 있습니다.
                    <br/>
                    이 시스템은 당신의 손끝에서 점점 더 ‘당신다운’ 집으로 완성됩니다.
                </p>
            </div>
        </motion.div>
    );
};
