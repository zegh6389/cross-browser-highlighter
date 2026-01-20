-- Migration: 00003_create_highlights
-- Description: Create highlights table for storing user highlights with full-text search

-- Create highlights table
CREATE TABLE highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- URL information
    url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    page_title TEXT,
    
    -- Highlight content
    text TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'yellow',
    word_count INTEGER NOT NULL DEFAULT 0,
    
    -- Anchoring data (for restoring highlight position)
    anchor JSONB NOT NULL,
    
    -- Optional note
    note TEXT,
    note_color TEXT DEFAULT 'yellow',
    
    -- Sync metadata
    local_id TEXT, -- Original ID from extension for deduplication
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_highlights_user_id ON highlights(user_id);
CREATE INDEX idx_highlights_normalized_url ON highlights(normalized_url);
CREATE INDEX idx_highlights_user_url ON highlights(user_id, normalized_url);
CREATE INDEX idx_highlights_created_at ON highlights(created_at DESC);
CREATE INDEX idx_highlights_deleted_at ON highlights(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_highlights_local_id ON highlights(user_id, local_id);

-- Full-text search index
CREATE INDEX idx_highlights_text_search ON highlights USING gin(to_tsvector('english', text));

-- Apply updated_at trigger
CREATE TRIGGER update_highlights_updated_at
    BEFORE UPDATE ON highlights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate word count
CREATE OR REPLACE FUNCTION calculate_word_count(p_text TEXT)
RETURNS INTEGER AS $$
BEGIN
    -- Count words by splitting on whitespace
    RETURN array_length(regexp_split_to_array(trim(p_text), '\s+'), 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate word count on insert/update
CREATE OR REPLACE FUNCTION set_highlight_word_count()
RETURNS TRIGGER AS $$
BEGIN
    NEW.word_count = calculate_word_count(NEW.text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_highlight_word_count
    BEFORE INSERT OR UPDATE OF text ON highlights
    FOR EACH ROW
    EXECUTE FUNCTION set_highlight_word_count();

-- Comments
COMMENT ON TABLE highlights IS 'User highlights synced from browser extension';
COMMENT ON COLUMN highlights.anchor IS 'JSON object containing text position data for highlight restoration';
COMMENT ON COLUMN highlights.local_id IS 'Original UUID from extension, used for deduplication during sync';
COMMENT ON COLUMN highlights.word_count IS 'Auto-calculated word count for usage tracking';
