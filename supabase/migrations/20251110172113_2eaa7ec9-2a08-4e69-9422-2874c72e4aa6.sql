-- Enable realtime for email_logs table
ALTER TABLE email_logs REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE email_logs;