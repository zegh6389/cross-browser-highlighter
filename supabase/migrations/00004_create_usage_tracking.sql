-- Migration: 00004_create_usage_tracking
-- Description: Create usage tracking table for enforcing word limits

-- Create usage_tracking table (one row per user)
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Word count tracking
    total_word_count INTEGER NOT NULL DEFAULT 0,
    synced_word_count INTEGER NOT NULL DEFAULT 0, -- Only synced highlights
    
    -- Highlight counts
    total_highlights_count INTEGER NOT NULL DEFAULT 0,
    synced_highlights_count INTEGER NOT NULL DEFAULT 0,
    
    -- Activity tracking
    last_highlight_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    
    -- Period tracking (for potential monthly limits)
    period_start TIMESTAMPTZ DEFAULT NOW(),
    period_word_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);

-- Apply updated_at trigger
CREATE TRIGGER update_usage_tracking_updated_at
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create usage tracking record for new users
CREATE OR REPLACE FUNCTION create_usage_tracking_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO usage_tracking (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create usage tracking when profile is created
CREATE TRIGGER on_profile_created_create_usage
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_usage_tracking_for_user();

-- Function to update usage tracking when highlights change
CREATE OR REPLACE FUNCTION update_usage_on_highlight_change()
RETURNS TRIGGER AS $$
DECLARE
    v_word_diff INTEGER;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New highlight added
        UPDATE usage_tracking
        SET 
            total_word_count = total_word_count + NEW.word_count,
            synced_word_count = synced_word_count + NEW.word_count,
            total_highlights_count = total_highlights_count + 1,
            synced_highlights_count = synced_highlights_count + 1,
            last_highlight_at = NEW.created_at,
            last_sync_at = NOW(),
            period_word_count = period_word_count + NEW.word_count
        WHERE user_id = NEW.user_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle soft delete
        IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            UPDATE usage_tracking
            SET 
                synced_word_count = synced_word_count - OLD.word_count,
                synced_highlights_count = synced_highlights_count - 1
            WHERE user_id = NEW.user_id;
        -- Handle restore from soft delete
        ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
            UPDATE usage_tracking
            SET 
                synced_word_count = synced_word_count + NEW.word_count,
                synced_highlights_count = synced_highlights_count + 1
            WHERE user_id = NEW.user_id;
        -- Handle text update
        ELSIF OLD.word_count != NEW.word_count THEN
            v_word_diff := NEW.word_count - OLD.word_count;
            UPDATE usage_tracking
            SET 
                total_word_count = total_word_count + v_word_diff,
                synced_word_count = synced_word_count + v_word_diff,
                period_word_count = period_word_count + v_word_diff
            WHERE user_id = NEW.user_id;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Hard delete (rare, prefer soft delete)
        UPDATE usage_tracking
        SET 
            total_word_count = total_word_count - OLD.word_count,
            synced_word_count = CASE WHEN OLD.deleted_at IS NULL 
                THEN synced_word_count - OLD.word_count 
                ELSE synced_word_count END,
            total_highlights_count = total_highlights_count - 1,
            synced_highlights_count = CASE WHEN OLD.deleted_at IS NULL 
                THEN synced_highlights_count - 1 
                ELSE synced_highlights_count END
        WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_usage_on_highlight
    AFTER INSERT OR UPDATE OR DELETE ON highlights
    FOR EACH ROW
    EXECUTE FUNCTION update_usage_on_highlight_change();

-- Function to check if user can sync more highlights
CREATE OR REPLACE FUNCTION can_user_sync(p_user_id UUID, p_word_count INTEGER DEFAULT 0)
RETURNS TABLE (
    can_sync BOOLEAN,
    current_words INTEGER,
    limit_words INTEGER,
    remaining_words INTEGER,
    has_subscription BOOLEAN
) AS $$
DECLARE
    v_current_words INTEGER;
    v_limit INTEGER := 300; -- Free tier limit
    v_has_sub BOOLEAN;
BEGIN
    -- Check subscription status
    v_has_sub := has_active_subscription(p_user_id);
    
    -- Get current synced word count
    SELECT COALESCE(synced_word_count, 0) INTO v_current_words
    FROM usage_tracking
    WHERE user_id = p_user_id;
    
    -- If no usage record exists, create one
    IF v_current_words IS NULL THEN
        v_current_words := 0;
    END IF;
    
    -- Return result
    RETURN QUERY SELECT
        v_has_sub OR (v_current_words + p_word_count <= v_limit) AS can_sync,
        v_current_words AS current_words,
        CASE WHEN v_has_sub THEN NULL::INTEGER ELSE v_limit END AS limit_words,
        CASE WHEN v_has_sub THEN NULL::INTEGER ELSE GREATEST(0, v_limit - v_current_words) END AS remaining_words,
        v_has_sub AS has_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE usage_tracking IS 'Tracks user usage for limit enforcement';
COMMENT ON COLUMN usage_tracking.synced_word_count IS 'Total words in non-deleted synced highlights';
COMMENT ON COLUMN usage_tracking.period_word_count IS 'Words synced in current billing period';
COMMENT ON FUNCTION can_user_sync IS 'Checks if user can sync highlights based on subscription and limits';
