-- Migration: 00007_create_extension_tokens
-- Description: Create table for secure web-to-extension authentication handoff

-- Create extension_auth_tokens table
CREATE TABLE extension_auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Token is stored hashed
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Short-lived token (5 minutes default)
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Tracking
    used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ext_tokens_user_id ON extension_auth_tokens(user_id);
CREATE INDEX idx_ext_tokens_token_hash ON extension_auth_tokens(token_hash);
CREATE INDEX idx_ext_tokens_expires_at ON extension_auth_tokens(expires_at);

-- Function to generate an extension auth token
-- Returns the plaintext token to send to extension
CREATE OR REPLACE FUNCTION generate_extension_token(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_token TEXT;
    v_token_hash TEXT;
BEGIN
    -- Generate a random 32-character token
    v_token := encode(gen_random_bytes(24), 'base64');
    v_token := regexp_replace(v_token, '[^a-zA-Z0-9]', '', 'g');
    
    -- Hash for storage
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
    
    -- Delete any existing unused tokens for this user
    DELETE FROM extension_auth_tokens 
    WHERE user_id = p_user_id AND used_at IS NULL;
    
    -- Insert new token (5 minute expiry)
    INSERT INTO extension_auth_tokens (user_id, token_hash, expires_at)
    VALUES (p_user_id, v_token_hash, NOW() + INTERVAL '5 minutes');
    
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to exchange token for user session info
CREATE OR REPLACE FUNCTION exchange_extension_token(p_token TEXT)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    role user_role,
    is_valid BOOLEAN
) AS $$
DECLARE
    v_token_hash TEXT;
    v_user_id UUID;
    v_token_id UUID;
BEGIN
    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');
    
    -- Find valid token
    SELECT eat.id, eat.user_id INTO v_token_id, v_user_id
    FROM extension_auth_tokens eat
    WHERE eat.token_hash = v_token_hash
        AND eat.used_at IS NULL
        AND eat.expires_at > NOW()
    FOR UPDATE;
    
    IF v_token_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::user_role, FALSE;
        RETURN;
    END IF;
    
    -- Mark token as used
    UPDATE extension_auth_tokens SET used_at = NOW() WHERE id = v_token_id;
    
    -- Return user info
    RETURN QUERY
    SELECT p.id, p.email, p.role, TRUE
    FROM profiles p
    WHERE p.id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup job: Delete expired tokens (run via cron or Supabase scheduled function)
CREATE OR REPLACE FUNCTION cleanup_expired_extension_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM extension_auth_tokens
    WHERE expires_at < NOW() - INTERVAL '1 hour'
    RETURNING 1 INTO v_deleted;
    
    RETURN COALESCE(v_deleted, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE extension_auth_tokens IS 'Short-lived tokens for web-to-extension auth handoff';
COMMENT ON FUNCTION generate_extension_token IS 'Creates a one-time token for extension authentication';
COMMENT ON FUNCTION exchange_extension_token IS 'Validates token and returns user info for extension';
