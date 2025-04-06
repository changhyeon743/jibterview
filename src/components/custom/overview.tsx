import { motion } from 'framer-motion';
import Link from 'next/link';

import { MessageIcon, SupabaseIcon, VercelIcon } from './icons';

export const Overview = () => {
  return (
      <motion.div
          key="overview"
          className="max-w-3xl mx-auto md:mt-20"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ delay: 0.5 }}
      >
        <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
          {/*<p className="flex flex-row justify-center gap-4 items-center">*/}
          {/*  <MessageIcon size={32} />*/}
          {/*  <span>+</span>*/}
          {/*  <SupabaseIcon />*/}
          {/*  <span>+</span>*/}
          {/*  <VercelIcon size={32} />*/}
          {/*</p>*/}
          <p>
            이 프로젝트는{' '}
            <Link
                className="font-medium underline underline-offset-4"
                href="https://github.com/vercel/ai-chatbot"
                target="_blank"
            >
              Christopher Alexander
            </Link>
            의 <i>Pattern Language</i> 이론을 바탕으로, 비전문가의 삶의 요구를 자연어로 입력받아 적합한 주거 평면도를 추천하는 AI 기반 시스템입니다. 평면도는 체계적으로 분석되어{' '}
            <Link
                className="font-medium underline underline-offset-4"
                href="https://neo4j.com"
                target="_blank"
            >
              Neo4j
            </Link>{' '}
            그래프 데이터베이스에 저장됩니다.
          </p>
          <p>
            이 시스템은 자연어 대화 → 구조화된 질문 → Cypher 쿼리 생성 → 추천의 흐름으로 작동합니다. 공간은 '기능'이 아니라 '삶의 패턴'을 중심으로 설계되어야 한다는 철학을 바탕으로, 비전문가도 쉽게 자신의 공간 요구를 표현하고 그에 맞는 평면도를 추천받을 수 있습니다.
          </p>
        </div>
      </motion.div>
  );
};
