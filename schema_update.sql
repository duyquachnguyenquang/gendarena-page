-- ╔══════════════════════════════════════════════════════════════════╗
-- ║                  ⛔  SAFETY WARNING  ⛔                        ║
-- ║                                                                  ║
-- ║  ONE-SHOT BOOTSTRAP SCRIPT — DO NOT RERUN ON ANY ENVIRONMENT   ║
-- ║  THAT HAS LIVE DATA                                              ║
-- ║                                                                  ║
-- ║  This file was designed to be executed ONCE on an empty DB.     ║
-- ║  It contains BARE DELETE statements with no WHERE condition:     ║
-- ║                                                                  ║
-- ║      DELETE FROM submission_history;  -- wipes entire table     ║
-- ║      DELETE FROM submissions;         -- wipes entire table     ║
-- ║      DELETE FROM competition_phases;  -- wipes entire table     ║
-- ║                                                                  ║
-- ║  Re-running this script on production WILL permanently delete   ║
-- ║  all submission, submission history, and phase data.            ║
-- ║                                                                  ║
-- ║  BEFORE RUNNING:                                                 ║
-- ║    1. Confirm you are on a fresh / empty database.              ║
-- ║    2. Back up the database if any data exists.                  ║
-- ║    3. Read SQL_MIGRATIONS_README.md for execution order.        ║
-- ║                                                                  ║
-- ║  See audit: SQL_MIGRATIONS_README.md                            ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════
-- PHẦN 1: UPDATE LỊCH TRÌNH & THỂ LOẠI SỰ KIỆN
-- ═══════════════════════════════════════════

-- Thêm cột event_type vào competition_phases nếu chưa có
ALTER TABLE competition_phases 
  ADD COLUMN IF NOT EXISTS event_type TEXT CHECK (event_type IN ('round', 'event', 'webinar'));

-- Reset dữ liệu cũ để đồng bộ timeline mới
DELETE FROM submission_history;
DELETE FROM submissions;
DELETE FROM competition_phases;

-- Chèn dữ liệu mới vào bảng competition_phases
INSERT INTO competition_phases (
  phase_number,
  title,
  description,
  start_date,
  end_date,
  status,
  icon,
  display_order,
  submission_open,
  submission_type,
  event_type
) VALUES
(1, 'Gia hạn đăng ký vòng Sơ loại: DREAM', 'GenD Arena 2026 là sàn đấu khởi nghiệp hiện đại, nơi thế hệ số Việt Nam giải quyết những vấn đề thị trường khó nhằn bằng các bài toán công nghệ tối ưu. Cuộc thi được đồng tổ chức bởi CLB Khởi nghiệp (SSE) và CLB Entrepreneurship (FIC) cùng đội ngũ chuyên gia đông đảo đến từ đa lĩnh vực.', '2026-09-01', '2026-09-22', 'upcoming', 'target', 1, false, 'file', 'round'),
(2, 'Sự kiện kick-off', 'Khởi động cuộc thi, giới thiệu lộ trình và luật chơi chi tiết của GenD Arena 2026.', '2026-09-06', '2026-09-06', 'upcoming', 'flag', 2, false, 'file', 'event'),
(3, 'Webinar ARENA BOOSTER: Scouting', 'Buổi hội thảo định hướng, tìm kiếm ý tưởng đột phá và thành lập đội thi.', '2026-09-12', '2026-09-12', 'upcoming', 'book', 3, false, 'file', 'webinar'),
(4, 'Webinar ARENA BOOSTER: Forging', 'Trang bị kiến thức và kỹ năng thiết kế mô hình kinh doanh bền vững.', '2026-09-13', '2026-09-13', 'upcoming', 'book', 4, false, 'file', 'webinar'),
(5, 'Webinar ARENA BOOSTER: Combat', 'Hoàn thiện năng lực phát triển sản phẩm công nghệ và giải pháp thực tế.', '2026-10-04', '2026-10-04', 'upcoming', 'book', 5, false, 'file', 'webinar'),
(6, 'Vòng hackathon: DESIGN', '48 giờ lập trình và thiết kế sản phẩm thực tế đầy căng thẳng để chọn ra những đội xuất sắc nhất.', '2026-10-10', '2026-10-11', 'upcoming', 'clipboard', 6, false, 'file', 'round'),
(7, 'Webinar ARENA BOOSTER: Conquer', 'Bứt phá kỹ năng thuyết trình, chuẩn bị tài liệu gọi vốn cho chung kết.', '2026-10-25', '2026-10-25', 'upcoming', 'book', 7, false, 'file', 'webinar'),
(8, 'Đêm chung kết: DEVELOP', 'Trình diễn giải pháp thực tế, tranh tài trước hội đồng BGK chuyên gia để tìm ra nhà vô địch GenD Arena 2026.', '2026-11-08', '2026-11-08', 'upcoming', 'trophy', 8, false, 'file', 'round');

-- ═══════════════════════════════════════════
-- PHẦN 3: SCHEMA UPDATE CHO TEAM MANAGEMENT
-- ═══════════════════════════════════════════

-- 1. Thêm UID cho profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS uid TEXT UNIQUE;

-- Function tạo UID 8 ký tự alphanumeric ngẫu nhiên
CREATE OR REPLACE FUNCTION generate_uid()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger gán UID khi chèn mới
CREATE OR REPLACE FUNCTION set_uid_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.uid IS NULL THEN
    LOOP
      NEW.uid := generate_uid();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE uid = NEW.uid);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_uid ON profiles;
CREATE TRIGGER trigger_set_uid
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_uid_on_profile();

-- Gán UID cho các user cũ chưa có
UPDATE profiles SET uid = generate_uid() WHERE uid IS NULL;

-- 2. Thêm max_members vào teams
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

-- 3. Tạo bảng team_join_requests
CREATE TABLE IF NOT EXISTS team_join_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id),
  UNIQUE (team_id, requester_id)
);

ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;

-- Policies cho team_join_requests
DROP POLICY IF EXISTS "Users view own requests" ON team_join_requests;
CREATE POLICY "Users view own requests"
ON team_join_requests FOR SELECT TO authenticated
USING (requester_id = auth.uid());

DROP POLICY IF EXISTS "Leaders view team requests" ON team_join_requests;
CREATE POLICY "Leaders view team requests"
ON team_join_requests FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM teams WHERE id = team_id AND leader_id = auth.uid())
);

DROP POLICY IF EXISTS "Users create requests" ON team_join_requests;
CREATE POLICY "Users create requests"
ON team_join_requests FOR INSERT TO authenticated
WITH CHECK (
  requester_id = auth.uid()
);

DROP POLICY IF EXISTS "Leaders update requests" ON team_join_requests;
CREATE POLICY "Leaders update requests"
ON team_join_requests FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM teams WHERE id = team_id AND leader_id = auth.uid())
);

DROP POLICY IF EXISTS "Users delete own pending requests" ON team_join_requests;
CREATE POLICY "Users delete own pending requests"
ON team_join_requests FOR DELETE TO authenticated
USING (requester_id = auth.uid() AND status = 'pending');

-- 4. Tạo bảng team_invites
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_uid TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Policies cho team_invites
DROP POLICY IF EXISTS "View own invites" ON team_invites;
CREATE POLICY "View own invites"
ON team_invites FOR SELECT TO authenticated
USING (
  invited_uid = (SELECT uid FROM profiles WHERE id = auth.uid())
  OR invited_by = auth.uid()
);

DROP POLICY IF EXISTS "Leaders create invites" ON team_invites;
CREATE POLICY "Leaders create invites"
ON team_invites FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE id = team_id AND leader_id = auth.uid())
);

DROP POLICY IF EXISTS "Invited user updates status" ON team_invites;
CREATE POLICY "Invited user updates status"
ON team_invites FOR UPDATE TO authenticated
USING (
  invited_uid = (SELECT uid FROM profiles WHERE id = auth.uid())
);

-- 5. Tạo bảng cho Speakers / Judges / Sponsors
CREATE TABLE IF NOT EXISTS speakers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT,
  organization TEXT,
  bio TEXT,
  avatar_url TEXT,
  linkedin_url TEXT,
  display_order INTEGER DEFAULT 0,
  category TEXT DEFAULT 'speaker' CHECK (category IN ('speaker', 'judge', 'mentor')),
  is_featured BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read speakers" ON speakers;
CREATE POLICY "Public read speakers"
ON speakers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage speakers" ON speakers;
CREATE POLICY "Admin manage speakers"
ON speakers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sponsors
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  tier TEXT DEFAULT 'partner' CHECK (tier IN ('platinum', 'gold', 'silver', 'partner')),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read sponsors" ON sponsors;
CREATE POLICY "Public read sponsors"
ON sponsors FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage sponsors" ON sponsors;
CREATE POLICY "Admin manage sponsors"
ON sponsors FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
