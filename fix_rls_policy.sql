-- Fix RLS Policy for DMs table to allow marking messages as read
-- Run this in your Supabase SQL Editor

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their own messages" ON "DMs";
DROP POLICY IF EXISTS "DMs update policy" ON "DMs";

-- Create a new update policy that allows:
-- 1. Users to update messages they sent (for editing their own messages)
-- 2. Users to update the 'read' field of messages they received
CREATE POLICY "DMs update policy" ON "DMs"
FOR UPDATE USING (
  -- User is the sender (can edit their own messages)
  auth.uid() = sender_id 
  OR 
  -- User is the receiver (can mark messages as read)
  auth.uid() = receiver_id
);

-- If you want to be more restrictive and only allow specific field updates:
-- You can use this alternative policy instead:
/*
CREATE POLICY "DMs restrictive update policy" ON "DMs"
FOR UPDATE USING (
  -- User is the sender (can edit message content)
  (auth.uid() = sender_id) 
  OR 
  -- User is the receiver and can only update read status
  (auth.uid() = receiver_id AND 
   OLD.message = NEW.message AND 
   OLD.sender_id = NEW.sender_id AND 
   OLD.receiver_id = NEW.receiver_id AND
   OLD.created_at = NEW.created_at)
);
*/

-- Ensure RLS is enabled on the DMs table
ALTER TABLE "DMs" ENABLE ROW LEVEL SECURITY; 