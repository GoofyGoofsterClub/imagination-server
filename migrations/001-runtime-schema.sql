-- Applied automatically on the first startup that needs this version.
CREATE TABLE IF NOT EXISTS uwuso.settings (key text PRIMARY KEY, value text NOT NULL);
CREATE TABLE IF NOT EXISTS uwuso.service_announcements (
    id integer PRIMARY KEY, message text NOT NULL, severity text NOT NULL,
    button_text text, button_url text, image_url text,
    updated_at timestamptz NOT NULL DEFAULT NOW()
);
ALTER TABLE uwuso.service_announcements ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE uwuso.uploads ALTER COLUMN uploader_id DROP NOT NULL;

-- Preserve files on account deletion; only replace constraints with the wrong rule.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'uwuso.uploads'::regclass
        AND conname = 'uploader_id_fk' AND confdeltype <> 'n') THEN
        ALTER TABLE uwuso.uploads DROP CONSTRAINT uploader_id_fk;
        ALTER TABLE uwuso.uploads ADD CONSTRAINT uploader_id_fk FOREIGN KEY (uploader_id)
            REFERENCES uwuso.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- A one-time reconciliation, protected against concurrent upload writes.
LOCK TABLE uwuso.uploads IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS uwuso.storage_usage (
    uploader_id bigint PRIMARY KEY REFERENCES uwuso.users(id) ON DELETE CASCADE,
    used_bytes bigint NOT NULL DEFAULT 0 CHECK (used_bytes >= 0)
);
INSERT INTO uwuso.storage_usage (uploader_id, used_bytes)
    SELECT uploader_id, COALESCE(SUM(filesize), 0) FROM uwuso.uploads
    WHERE uploader_id IS NOT NULL GROUP BY uploader_id
ON CONFLICT (uploader_id) DO UPDATE SET used_bytes = EXCLUDED.used_bytes;

CREATE OR REPLACE FUNCTION uwuso.track_storage_usage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE used bigint; quota bigint;
BEGIN
    IF TG_OP <> 'INSERT' AND OLD.uploader_id IS NOT NULL THEN
        UPDATE uwuso.storage_usage SET used_bytes = GREATEST(0, used_bytes - OLD.filesize)
            WHERE uploader_id = OLD.uploader_id;
    END IF;
    IF TG_OP <> 'DELETE' AND NEW.uploader_id IS NOT NULL THEN
        INSERT INTO uwuso.storage_usage (uploader_id, used_bytes) VALUES (NEW.uploader_id, NEW.filesize)
            ON CONFLICT (uploader_id) DO UPDATE SET used_bytes = uwuso.storage_usage.used_bytes + EXCLUDED.used_bytes
            RETURNING used_bytes INTO used;
        quota := COALESCE(NULLIF(current_setting('imagination.storage_quota', true), ''), '0')::bigint;
        IF quota > 0 AND used > quota THEN
            RAISE EXCEPTION 'Storage quota exceeded.' USING ERRCODE = '23514', CONSTRAINT = 'storage_quota_exceeded';
        END IF;
    END IF;
    RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS track_storage_usage ON uwuso.uploads;
CREATE TRIGGER track_storage_usage AFTER INSERT OR DELETE OR UPDATE OF filesize, uploader_id
    ON uwuso.uploads FOR EACH ROW EXECUTE FUNCTION uwuso.track_storage_usage();
