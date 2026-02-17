-- =============================================================
-- TranslateIO: Supabase Migration SQL
-- Run this in Supabase SQL Editor AFTER running `npx drizzle-kit push`
-- =============================================================

-- 1. Drop old NextAuth tables if they exist
DROP TABLE IF EXISTS "verificationToken" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- 2. Add FK constraints from domain tables to auth.users
ALTER TABLE videos
  ADD CONSTRAINT videos_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE attempts
  ADD CONSTRAINT attempts_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE vocabulary
  ADD CONSTRAINT vocabulary_user_id_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Enable RLS on all domain tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (defense-in-depth — Drizzle connects as postgres and bypasses RLS)

-- Videos: users can only see/modify their own videos
CREATE POLICY "Users can view own videos"
  ON videos FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own videos"
  ON videos FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own videos"
  ON videos FOR DELETE
  USING (auth.uid()::text = user_id);

-- Segments: users can access segments of their own videos
CREATE POLICY "Users can view segments of own videos"
  ON segments FOR SELECT
  USING (video_id IN (SELECT id FROM videos WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can insert segments for own videos"
  ON segments FOR INSERT
  WITH CHECK (video_id IN (SELECT id FROM videos WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can update segments of own videos"
  ON segments FOR UPDATE
  USING (video_id IN (SELECT id FROM videos WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can delete segments of own videos"
  ON segments FOR DELETE
  USING (video_id IN (SELECT id FROM videos WHERE user_id = auth.uid()::text));

-- Attempts: users can only see/create their own attempts
CREATE POLICY "Users can view own attempts"
  ON attempts FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own attempts"
  ON attempts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Sessions (practice sessions): accessible if user owns the video
CREATE POLICY "Users can view sessions of own videos"
  ON sessions FOR SELECT
  USING (video_id IN (SELECT id FROM videos WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can insert sessions for own videos"
  ON sessions FOR INSERT
  WITH CHECK (video_id IN (SELECT id FROM videos WHERE user_id = auth.uid()::text));

CREATE POLICY "Users can update sessions of own videos"
  ON sessions FOR UPDATE
  USING (video_id IN (SELECT id FROM videos WHERE user_id = auth.uid()::text));

-- Vocabulary: users can only see/modify their own vocabulary
CREATE POLICY "Users can view own vocabulary"
  ON vocabulary FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own vocabulary"
  ON vocabulary FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own vocabulary"
  ON vocabulary FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own vocabulary"
  ON vocabulary FOR DELETE
  USING (auth.uid()::text = user_id);
