-- Add timezone to workers and vendors tables
ALTER TABLE workers ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Create chat_rooms table for job/task discussions
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'job', 'job_task', 'team_task', 'direct'
  entity_id UUID, -- references jobs/job_tasks/team_tasks id
  name TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL, -- 'company', 'vendor', 'worker'
  message TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view chat rooms they participate in"
ON chat_rooms FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.room_id = chat_rooms.id
    AND chat_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create chat rooms"
ON chat_rooms FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.company_id = chat_rooms.company_id
  )
);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their chat rooms"
ON chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.room_id = chat_messages.room_id
    AND chat_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON chat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.room_id = chat_messages.room_id
    AND chat_participants.user_id = auth.uid()
  )
);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their chat rooms"
ON chat_participants FOR SELECT
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM chat_participants cp
  WHERE cp.room_id = chat_participants.room_id
  AND cp.user_id = auth.uid()
));

CREATE POLICY "Users can join chat rooms"
ON chat_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their participation"
ON chat_participants FOR UPDATE
USING (user_id = auth.uid());

-- Add realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Update trigger for chat_rooms
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();