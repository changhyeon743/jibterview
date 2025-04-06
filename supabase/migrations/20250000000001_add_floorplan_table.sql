-- floorplans 테이블: 평면도 기본 정보 저장
CREATE TABLE floorplans (
                            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                            chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
                            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                            serialized_data JSONB NOT NULL,
                            metadata JSONB,
                            title TEXT,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스 추가
CREATE INDEX idx_floorplans_chat_id ON floorplans(chat_id);
CREATE INDEX idx_floorplans_user_id ON floorplans(user_id);

-- 권한 설정
ALTER TABLE floorplans ENABLE ROW LEVEL SECURITY;

-- 권한 정책: 사용자는 자신의 평면도만 접근 가능
CREATE POLICY "Users can only access their own floorplans"
  ON floorplans
  FOR ALL
  USING (auth.uid() = user_id);

-- 히스토리 테이블: 평면도 변경 이력 저장
CREATE TABLE floorplan_versions (
                                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                                    floorplan_id UUID NOT NULL REFERENCES floorplans(id) ON DELETE CASCADE,
                                    serialized_data JSONB NOT NULL,
                                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                                    created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- 인덱스 추가
CREATE INDEX idx_floorplan_versions_floorplan_id ON floorplan_versions(floorplan_id);

-- 권한 설정
ALTER TABLE floorplan_versions ENABLE ROW LEVEL SECURITY;

-- 권한 정책: 사용자는 자신의 평면도 버전만 접근 가능
CREATE POLICY "Users can only access their own floorplan versions"
  ON floorplan_versions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM floorplans
    WHERE floorplans.id = floorplan_versions.floorplan_id
    AND floorplans.user_id = auth.uid()
  ));

-- 평면도를 저장하기 위한 함수
CREATE OR REPLACE FUNCTION save_floorplan(
  p_chat_id UUID,
  p_serialized_data JSONB,
  p_title TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
v_floorplan_id UUID;
BEGIN
  -- 해당 채팅의 평면도가 있는지 확인
SELECT id INTO v_floorplan_id FROM floorplans WHERE chat_id = p_chat_id AND user_id = auth.uid();

IF v_floorplan_id IS NULL THEN
    -- 새 평면도 생성
    INSERT INTO floorplans (chat_id, user_id, serialized_data, title, metadata)
    VALUES (p_chat_id, auth.uid(), p_serialized_data, p_title, p_metadata)
    RETURNING id INTO v_floorplan_id;
ELSE
    -- 기존 평면도 업데이트
UPDATE floorplans
SET serialized_data = p_serialized_data,
    title = COALESCE(p_title, title),
    metadata = COALESCE(p_metadata, metadata),
    updated_at = now()
WHERE id = v_floorplan_id;

-- 버전 저장
INSERT INTO floorplan_versions (floorplan_id, serialized_data, created_by)
VALUES (v_floorplan_id, p_serialized_data, auth.uid());
END IF;

RETURN v_floorplan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 평면도를 가져오기 위한 함수
CREATE OR REPLACE FUNCTION get_floorplan_by_chat_id(p_chat_id UUID)
RETURNS TABLE (
  id UUID,
  chat_id UUID,
  user_id UUID,
  serialized_data JSONB,
  metadata JSONB,
  title TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
RETURN QUERY
SELECT f.id, f.chat_id, f.user_id, f.serialized_data, f.metadata, f.title, f.created_at, f.updated_at
FROM floorplans f
WHERE f.chat_id = p_chat_id
  AND f.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
