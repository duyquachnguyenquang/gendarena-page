-- ==============================================================================
-- Migration: Booth Voting System for Grand Finale (08/11/2026 14:00 - 15:30 GMT+7)
-- File: supabase/migrations/booth_voting_migration.sql
-- Safe & Idempotent: Can be run multiple times without data loss.
-- Zero-PII: Stores only one-way cryptographic hashes (SHA-256), never personal data.
-- ==============================================================================

-- 1. Table: booth_voting_settings (Singleton configuration for BTC Gate Control)
CREATE TABLE IF NOT EXISTS public.booth_voting_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  gate_mode TEXT NOT NULL DEFAULT 'auto' CHECK (gate_mode IN ('auto', 'force_open', 'force_closed')),
  start_time TIMESTAMPTZ NOT NULL DEFAULT '2026-11-08T14:00:00+07:00',
  end_time TIMESTAMPTZ NOT NULL DEFAULT '2026-11-08T15:30:00+07:00',
  ip_mode TEXT NOT NULL DEFAULT 'strict' CHECK (ip_mode IN ('strict', 'venue_wifi')),
  block_vpn BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.booth_voting_settings (id, gate_mode, start_time, end_time, ip_mode, block_vpn)
VALUES ('default', 'auto', '2026-11-08T14:00:00+07:00', '2026-11-08T15:30:00+07:00', 'strict', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Table: booth_vote_counts (Pre-aggregated atomic counters for instant Realtime BTC dashboard)
CREATE TABLE IF NOT EXISTS public.booth_vote_counts (
  team_id TEXT PRIMARY KEY,
  msbc TEXT NOT NULL,
  team_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0,
  last_vote_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the Top 5 official Grand Finale booth teams
DELETE FROM public.booth_vote_counts
WHERE team_id NOT IN (
  '9e9103e9-a725-48cf-b4da-519f0b68e24a',
  'e5e79a05-cc45-4015-811b-17d3965e32f2',
  '61157dca-cf00-48a6-9868-6599b0b4d0da',
  'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb',
  'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f'
);

INSERT INTO public.booth_vote_counts (team_id, msbc, team_name, slug, vote_count, blocked_count)
VALUES
  ('9e9103e9-a725-48cf-b4da-519f0b68e24a', '01', 'Aqua Radar', 'aqua-radar', 0, 0),
  ('e5e79a05-cc45-4015-811b-17d3965e32f2', '02', 'Axiom', 'axiom', 0, 0),
  ('61157dca-cf00-48a6-9868-6599b0b4d0da', '03', 'Viet Nam Safe', 'viet-nam-safe', 0, 0),
  ('f103ffe4-bf05-49a3-a373-6a30ddaa3fdb', '04', 'Ngũ Long Công Chúa', 'ngu-long-cong-chua', 0, 0),
  ('a2d974ad-a2ae-4854-a3e6-735d76c2dc5f', '05', 'Change yourself', 'change-yourself', 0, 0)
ON CONFLICT (team_id) DO UPDATE
SET
  msbc = EXCLUDED.msbc,
  team_name = EXCLUDED.team_name,
  slug = EXCLUDED.slug;

-- 3. Table: booth_votes (Anonymous cryptographic vote ledger - Zero PII)
CREATE TABLE IF NOT EXISTS public.booth_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL REFERENCES public.booth_vote_counts(team_id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  device_hash TEXT NOT NULL,
  canvas_hash TEXT,
  subnet_hash TEXT,
  receipt_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast uniqueness & anti-cheat lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_booth_votes_unique_team_device
  ON public.booth_votes (team_id, device_hash);

CREATE INDEX IF NOT EXISTS idx_booth_votes_team_ip
  ON public.booth_votes (team_id, ip_hash);

CREATE INDEX IF NOT EXISTS idx_booth_votes_team_canvas
  ON public.booth_votes (team_id, canvas_hash)
  WHERE canvas_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booth_votes_created_at
  ON public.booth_votes (created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.booth_voting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_vote_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read booth voting settings" ON public.booth_voting_settings;
CREATE POLICY "Public can read booth voting settings"
  ON public.booth_voting_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can read booth vote counts" ON public.booth_vote_counts;
CREATE POLICY "Public can read booth vote counts"
  ON public.booth_vote_counts FOR SELECT
  USING (true);

-- Only service_role / security definer RPC can insert or read booth_votes
DROP POLICY IF EXISTS "Admins can read booth votes" ON public.booth_votes;
CREATE POLICY "Admins can read booth votes"
  ON public.booth_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. Enable Supabase Realtime on booth_vote_counts and booth_voting_settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'booth_vote_counts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_vote_counts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'booth_voting_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_voting_settings;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 6. Atomic PostgreSQL RPC: cast_booth_vote
CREATE OR REPLACE FUNCTION public.cast_booth_vote(
  p_team_id TEXT,
  p_ip_hash TEXT,
  p_device_hash TEXT,
  p_canvas_hash TEXT DEFAULT NULL,
  p_subnet_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_now TIMESTAMPTZ := now();
  v_is_open BOOLEAN := false;
  v_vote_id UUID;
  v_receipt TEXT;
  v_new_count INTEGER;
  v_ip_recent_votes INTEGER;
BEGIN
  -- 1. Fetch gate settings
  SELECT * INTO v_settings
  FROM public.booth_voting_settings
  WHERE id = 'default';

  IF NOT FOUND THEN
    v_is_open := (v_now >= '2026-11-08T14:00:00+07:00'::timestamptz AND v_now <= '2026-11-08T15:30:00+07:00'::timestamptz);
  ELSE
    IF v_settings.gate_mode = 'force_open' THEN
      v_is_open := true;
    ELSIF v_settings.gate_mode = 'force_closed' THEN
      v_is_open := false;
    ELSE
      v_is_open := (v_now >= v_settings.start_time AND v_now <= v_settings.end_time);
    END IF;
  END IF;

  IF NOT v_is_open THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'GATE_CLOSED',
      'message', 'Cổng bình chọn gian hàng chỉ mở từ 14:00 đến 15:30 ngày 08/11/2026.'
    );
  END IF;

  -- 2. Verify team exists in booth_vote_counts
  IF NOT EXISTS (SELECT 1 FROM public.booth_vote_counts WHERE team_id = p_team_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'TEAM_NOT_FOUND',
      'message', 'Không tìm thấy thông tin đội thi.'
    );
  END IF;

  -- 3. Check Device Fingerprint duplicate (Blocks Incognito / Private Browsing)
  IF EXISTS (
    SELECT 1 FROM public.booth_votes
    WHERE team_id = p_team_id
      AND (
        device_hash = p_device_hash
        OR (p_canvas_hash IS NOT NULL AND p_canvas_hash <> '' AND canvas_hash = p_canvas_hash AND ip_hash = p_ip_hash)
      )
  ) THEN
    UPDATE public.booth_vote_counts
    SET blocked_count = blocked_count + 1, updated_at = v_now
    WHERE team_id = p_team_id;

    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_VOTED_DEVICE',
      'message', 'Thiết bị của bạn đã bình chọn cho đội thi này rồi (mỗi máy chỉ được bình chọn 1 lần/đội).'
    );
  END IF;

  -- 4. Check IP duplicate based on ip_mode ('strict' = 1 IP 1 vote/team; 'venue_wifi' = rate-limited shared Wi-Fi)
  IF COALESCE(v_settings.ip_mode, 'strict') = 'strict' THEN
    IF EXISTS (
      SELECT 1 FROM public.booth_votes
      WHERE team_id = p_team_id AND ip_hash = p_ip_hash
    ) THEN
      UPDATE public.booth_vote_counts
      SET blocked_count = blocked_count + 1, updated_at = v_now
      WHERE team_id = p_team_id;

      RETURN jsonb_build_object(
        'success', false,
        'code', 'ALREADY_VOTED_IP',
        'message', 'Địa chỉ IP mạng này đã bình chọn cho đội thi này rồi (mỗi IP chỉ được bình chọn 1 lần/đội).'
      );
    END IF;
  ELSE
    -- In venue_wifi mode, still prevent burst spam from a single IP (> 12 votes in 1 minute for the same team)
    SELECT count(*) INTO v_ip_recent_votes
    FROM public.booth_votes
    WHERE team_id = p_team_id
      AND ip_hash = p_ip_hash
      AND created_at >= (v_now - interval '1 minute');

    IF v_ip_recent_votes >= 12 THEN
      UPDATE public.booth_vote_counts
      SET blocked_count = blocked_count + 1, updated_at = v_now
      WHERE team_id = p_team_id;

      RETURN jsonb_build_object(
        'success', false,
        'code', 'RATE_LIMITED',
        'message', 'Hệ thống đang ghi nhận lượng truy cập lớn từ cùng điểm mạng. Vui lòng thử lại sau vài giây.'
      );
    END IF;
  END IF;

  -- 5. Generate anonymous receipt code & insert vote atomically
  v_receipt := 'BV-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO public.booth_votes (
    team_id,
    ip_hash,
    device_hash,
    canvas_hash,
    subnet_hash,
    receipt_code,
    created_at
  ) VALUES (
    p_team_id,
    p_ip_hash,
    p_device_hash,
    NULLIF(p_canvas_hash, ''),
    NULLIF(p_subnet_hash, ''),
    v_receipt,
    v_now
  )
  RETURNING id INTO v_vote_id;

  -- 6. Atomically increment counter for Realtime BTC broadcast
  UPDATE public.booth_vote_counts
  SET
    vote_count = vote_count + 1,
    last_vote_at = v_now,
    updated_at = v_now
  WHERE team_id = p_team_id
  RETURNING vote_count INTO v_new_count;

  RETURN jsonb_build_object(
    'success', true,
    'code', 'VOTE_RECORDED',
    'message', 'Bình chọn gian hàng thành công!',
    'receipt_code', v_receipt,
    'voted_at', v_now,
    'vote_count', v_new_count
  );

EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.booth_vote_counts
    SET blocked_count = blocked_count + 1, updated_at = now()
    WHERE team_id = p_team_id;

    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_VOTED',
      'message', 'Bạn đã bình chọn cho đội thi này rồi (mỗi máy/IP chỉ được bình chọn 1 lần/đội).'
    );
  WHEN OTHERS THEN
    -- Fallback if pgcrypto gen_random_bytes is not in extensions schema
    RETURN jsonb_build_object(
      'success', false,
      'code', 'DB_ERROR',
      'message', 'Lỗi ghi nhận bình chọn: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_booth_vote(TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cast_booth_vote(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_booth_vote(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
