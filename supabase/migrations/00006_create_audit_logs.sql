-- Migration: 00006_create_audit_logs
-- Description: Create audit logs table for tracking sensitive actions

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Actor
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Action details
    action TEXT NOT NULL,
    entity_type TEXT, -- e.g., 'user', 'subscription', 'highlight', 'admin_code'
    entity_id UUID,
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    
    -- Request info
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Partition by month for better performance (optional, for high volume)
-- CREATE TABLE audit_logs PARTITION BY RANGE (created_at);

-- Function to log an action
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_metadata, p_ip_address, p_user_agent)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for security-sensitive actions';
COMMENT ON COLUMN audit_logs.action IS 'Action type: login, logout, subscription_created, admin_code_used, etc.';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context as JSON (e.g., old/new values)';
