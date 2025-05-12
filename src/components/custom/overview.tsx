'use client';

import {CubeIcon} from "@radix-ui/react-icons";
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
                className="rounded-xl p-6 flex flex-col gap-2 leading-relaxed text-center max-w-3xl text-gray-900">
                <p className="text-xl font-bold text-foreground flex flex-col gap-0">
                    <CubeIcon className='size-8 mx-auto'/>
                    <span className='text-[15.5px]'>myspatial</span>
                </p>

                <p>
                    이 시스템에는 &apos;나&apos;의 맞춤형 평면도를 잘 찾을 수 있도록 대화형 에이전트가 설계되어있습니다.<br/>
                    아래 버튼을 눌러 시작해보고, 편집해보세요.
                </p>

                <p className='text-xs text-muted-foreground'>
                    ※이 프로젝트는 서울시립대학 공간정보공학과 졸업연구의 구현체입니다.
                </p>

            </div>
        </motion.div>
    );
};
