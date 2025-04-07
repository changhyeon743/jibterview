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
          <p className="text-lg font-bold">
            당신이 꿈꾸는 집은 어떤 모습인가요?<br/>친구들과 모여 웃음꽃을 피울 수 있는 공간이 필요한가요,<br/>아니면 혼자만의 조용한 안식처가 필요한가요?
          </p>
          <p>
            우리의 AI 시스템은 당신의 일상과 감정, 삶의 방식을 자연어로 들려주시면, 그 이야기 속에서 당신에게 가장 적합한 주거 공간을 찾아드립니다. 복잡한 건축 용어를 몰라도 괜찮습니다. 당신의 삶에 대한 이야기만 들려주세요.
          </p>
          <p>
            이 시스템은{' '}
            <Link
                className="font-medium underline underline-offset-4"
                href="https://neo4j.com"
                target="_blank"
            >
              Neo4j
            </Link>{' '}
            그래프 데이터베이스에 저장된 평면도를 분석하여, 당신의 이야기에서 발견한 삶의 패턴과 가장 잘 어울리는 공간을 추천해 드립니다. 집은 단순한 &lsquo;기능&rsquo;의 집합이 아닌, 당신의 &lsquo;삶의 패턴&rsquo;이 자연스럽게 흐르는 곳이어야 하니까요.
          </p>
        </div>
      </motion.div>
  );
};
