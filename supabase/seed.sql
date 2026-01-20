-- Seed data for development
-- Run with: supabase db seed

-- Note: In production, the first admin must be created manually via Supabase dashboard
-- or by directly inserting into auth.users and profiles tables

-- Create a test admin activation code (for development only)
-- This code: "TESTADMIN123456" (hash shown below)
-- WARNING: Do NOT use this in production!
INSERT INTO admin_activation_codes (code_hash, expires_at, description)
VALUES (
    -- SHA-256 hash of 'TESTADMIN123456'
    encode(digest('TESTADMIN123456', 'sha256'), 'hex'),
    NOW() + INTERVAL '365 days',
    'Development test code - DO NOT USE IN PRODUCTION'
) ON CONFLICT DO NOTHING;

-- Insert some sample highlights structure (no actual user data)
-- Real data will come from user interactions

COMMENT ON TABLE admin_activation_codes IS 'NOTE: Remove seed codes before production deployment';
