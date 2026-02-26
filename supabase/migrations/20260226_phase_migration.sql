-- Migration from stage (1-4) to phase (1-5) system
-- This migration replaces the stage column with phase and adds supporting columns

-- Add new columns
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS phase integer DEFAULT 1;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel text DEFAULT 'app';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS phase_message_count integer DEFAULT 0;

-- Migrate data from stage to phase (1:1 mapping for existing stages)
UPDATE conversations SET phase = COALESCE(stage, 1);

-- Drop old stage column
ALTER TABLE conversations DROP COLUMN IF EXISTS stage;

-- Add comments for documentation
COMMENT ON COLUMN conversations.phase IS 'Current conversation phase: 1=flirt, 2=connection, 3=telegram, 4=tension, 5=post-date';
COMMENT ON COLUMN conversations.channel IS 'Communication channel: app or telegram';
COMMENT ON COLUMN conversations.phase_message_count IS 'Message count since entering current phase';
