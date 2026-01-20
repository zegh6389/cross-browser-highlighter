-- Migration: 00008_create_rls_policies
-- Description: Row Level Security policies for all tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extension_auth_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND (role = (SELECT role FROM profiles WHERE id = auth.uid()))
    );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- SUBSCRIPTIONS POLICIES
-- ============================================================================

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can insert/update (via webhooks)
-- No direct user modification allowed

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
    ON subscriptions FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- HIGHLIGHTS POLICIES
-- ============================================================================

-- Users can view their own highlights (including soft-deleted for recovery)
CREATE POLICY "Users can view own highlights"
    ON highlights FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own highlights
CREATE POLICY "Users can insert own highlights"
    ON highlights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own highlights
CREATE POLICY "Users can update own highlights"
    ON highlights FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own highlights
CREATE POLICY "Users can delete own highlights"
    ON highlights FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view all highlights (for support)
CREATE POLICY "Admins can view all highlights"
    ON highlights FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- USAGE TRACKING POLICIES
-- ============================================================================

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
    ON usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

-- No direct user modification (updated via triggers)

-- Admins can view all usage
CREATE POLICY "Admins can view all usage"
    ON usage_tracking FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- ADMIN ACTIVATION CODES POLICIES
-- ============================================================================

-- Admins can view all codes
CREATE POLICY "Admins can view activation codes"
    ON admin_activation_codes FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can insert codes (via function, but policy allows it)
CREATE POLICY "Admins can create activation codes"
    ON admin_activation_codes FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- No direct modification allowed (logs are immutable)

-- ============================================================================
-- EXTENSION AUTH TOKENS POLICIES
-- ============================================================================

-- Users can view their own tokens (limited use case)
CREATE POLICY "Users can view own extension tokens"
    ON extension_auth_tokens FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create tokens for themselves
CREATE POLICY "Users can create own extension tokens"
    ON extension_auth_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SERVICE ROLE BYPASS
-- ============================================================================
-- Note: Service role automatically bypasses RLS
-- Webhook handlers use service role for Stripe updates

-- Comments
COMMENT ON POLICY "Users can view own profile" ON profiles IS 'Users can only read their own profile data';
COMMENT ON POLICY "Users can update own profile" ON profiles IS 'Users can update profile but cannot change their role';
COMMENT ON POLICY "Users can view own highlights" ON highlights IS 'Users can only access their own highlights';
