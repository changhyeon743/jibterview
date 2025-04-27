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
                className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-3xl text-muted-foreground">
                <p className="text-xl font-semibold text-foreground flex flex-col gap-0.5">
                    <CubeIcon className='size-8 mx-auto'/>
                    나의 공간
                    <span className='text-lg'>My spatial-</span>
                </p>

                <p>
                    나를 설명하는 것은 나, 그리고 나의 공간입니다.<br/>
                    이 시스템에는 '나'의 공간을 잘 찾을 수 있도록 대화형 에이전트가 잘 설계되어있습니다.<br/>
                    아래 템플릿을 활용하여 시작해보고, 편집해보세요.
                </p>

            </div>
        </motion.div>
    );
};
