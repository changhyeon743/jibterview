// src/lib/blueprint/index.ts
// @orchestra blueprint

import { z } from 'zod';


/**
 * 물체 추가 함수 - 핵심 기능
 */
export const addFurniture = (
    type: string,
    x: number,
    y: number,
    rotation: number = 0,
    model: any
): any => {
    // 가구 유형별 메타데이터 매핑 - 간단한 버전
    const metadata = {
        itemName: `${type}.glb`,
        itemType: 1,
        modelURL: `/models/${type}.glb`,
        position: [x, 0, y],
        rotation: [0, 0, 0],
        innerRotation: [0, rotation, 0],
        scale: [1, 1, 1],
        size: [100, 80, 100], // 기본 크기
        fixed: false,
        resizable: true,
        mesh: [],
        textures: [],
    };

    // 아이템 추가 실행
    return model.addItemByMetaData(metadata);
};

/**
 * Blueprint 액션 도구 - 간소화된 버전
 */
export const BlueprintAction = {
    description: '평면도에 가구 추가 기능',
    parameters: z.object({
        action: z.string().describe('수행할 동작'),
        params: z.record(z.any()).describe('동작에 필요한 매개변수')
    }),
    execute: async ({ action, params }: any) => {
        try {
            // 핵심 기능인 가구 추가 기능만 구현
            if (action === 'ADD_FURNITURE') {
                // 실행 코드 생성
                const code = `
// 가구 추가 코드
const type = "${params.type || 'sofa'}";
const x = ${params.x || 0};
const y = ${params.y || 0};
const rotation = ${params.rotation || 0};

// addItem 함수를 사용해 가구 추가
const metadata = {
  itemName: \`\${type}.glb\`,
  itemType: 1,
  modelURL: \`/models/\${type}.glb\`,
  position: [x, 0, y],
  rotation: [0, 0, 0],
  innerRotation: [0, rotation, 0],
  scale: [1, 1, 1],
  size: [100, 80, 100],
  fixed: false,
  resizable: true,
  mesh: [],
  textures: []
};

addItem(metadata);
console.log('\${type}가 추가되었습니다.');
        `.trim();

                return {
                    code,
                    action,
                    message: `평면도에 ${params.type || '가구'} 추가가 요청되었습니다.`
                };
            }

            return {
                code: `console.log('지원하는 액션은 ADD_FURNITURE입니다.');`,
                action,
                message: `현재 지원하는 액션은 ADD_FURNITURE입니다.`
            };
        } catch (error) {
            console.error('Blueprint action execution error:', error);
            return {
                code: `console.error('오류가 발생했습니다: ${error}');`,
                action,
                error: String(error),
                message: `평면도 작업 중 오류가 발생했습니다.`
            };
        }
    },
};
