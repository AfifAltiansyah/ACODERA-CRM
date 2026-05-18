-- Fix notifications RLS: allow any role to insert (non-critical data)
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
CREATE POLICY "Anyone can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);
