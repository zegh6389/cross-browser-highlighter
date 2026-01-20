-- Migration: 00005_create_admin_codes
-- Description: Create admin activation codes table for secure admin registration

-- Create admin_activation_codes table
CREATE TABLE admin_activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Code is stored hashed for security
    code_hash TEXT NOT NULL UNIQUE,
    
    -- Tracking
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    used_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    
    -- Expiration
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    description TEXT, -- Optional note about the code's purpose
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_admin_codes_code_hash ON admin_activation_codes(code_hash);
CREATE INDEX idx_admin_codes_expires_at ON admin_activation_codes(expires_at);
CREATE INDEX idx_admin_codes_used_by ON admin_activation_codes(used_by);

-- Function to generate a secure activation code
-- Returns the plaintext code (to be shown once to admin)
-- Stores the hash in the database
CREATE OR REPLACE FUNCTION generate_admin_activation_code(
    p_created_by UUID,
    p_expires_in_days INTEGER DEFAULT 7,
    p_description TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_code_hash TEXT;
BEGIN
    -- Check if creator is admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_created_by AND role = 'admin') THEN
        RAISE EXCEPTION 'Only admins can generate activation codes';
    END IF;
    
    -- Generate a random 16-character alphanumeric code
    v_code := encode(gen_random_bytes(12), 'base64');
    v_code := regexp_replace(v_code, '[^a-zA-Z0-9]', '', 'g');
    v_code := substring(v_code from 1 for 16);
    
    -- Hash the code for storage
    v_code_hash := encode(digest(v_code, 'sha256'), 'hex');
    
    -- Insert the code
    INSERT INTO admin_activation_codes (code_hash, created_by, expires_at, description)
    VALUES (v_code_hash, p_created_by, NOW() + (p_expires_in_days || ' days')::INTERVAL, p_description);
    
    -- Return the plaintext code (shown only once)
    RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and use an activation code
CREATE OR REPLACE FUNCTION validate_and_use_activation_code(
    p_code TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_code_hash TEXT;
    v_code_id UUID;
BEGIN
    -- Hash the provided code
    v_code_hash := encode(digest(p_code, 'sha256'), 'hex');
    
    -- Find valid (unused, not expired) code
    SELECT id INTO v_code_id
    FROM admin_activation_codes
    WHERE code_hash = v_code_hash
        AND used_by IS NULL
        AND expires_at > NOW()
    FOR UPDATE; -- Lock the row
    
    IF v_code_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Mark code as used
    UPDATE admin_activation_codes
    SET used_by = p_user_id, used_at = NOW()
    WHERE id = v_code_id;
    
    -- Upgrade user to admin
    UPDATE profiles
    SET role = 'admin'
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a code is valid (without using it)
CREATE OR REPLACE FUNCTION is_activation_code_valid(p_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_code_hash TEXT;
BEGIN
    v_code_hash := encode(digest(p_code, 'sha256'), 'hex');
    
    RETURN EXISTS (
        SELECT 1 FROM admin_activation_codes
        WHERE code_hash = v_code_hash
            AND used_by IS NULL
            AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE admin_activation_codes IS 'Single-use activation codes for admin role assignment';
COMMENT ON COLUMN admin_activation_codes.code_hash IS 'SHA-256 hash of the activation code';
COMMENT ON FUNCTION generate_admin_activation_code IS 'Generates a new activation code (admin only)';
COMMENT ON FUNCTION validate_and_use_activation_code IS 'Validates and consumes an activation code, upgrading user to admin';
