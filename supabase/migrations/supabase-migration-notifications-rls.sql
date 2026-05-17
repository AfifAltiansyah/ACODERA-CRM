-- Notifications RLS Policy
-- Allow authenticated users to insert and read notifications

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert notifications
CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can read notifications
CREATE POLICY "Users can read notifications" ON notifications
  FOR SELECT USING (auth.role() = 'authenticated');
