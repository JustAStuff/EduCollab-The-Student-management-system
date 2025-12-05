-- Enhanced Public Chat Migration
-- This migration adds WhatsApp-like features to the public chat

-- Drop existing messages table if it exists and recreate with enhanced schema
DROP TABLE IF EXISTS public.messages CASCADE;

-- Create enhanced messages table
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE
);

-- Create message_status table for tracking read receipts
CREATE TABLE public.message_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Create online_users table for tracking who's online
CREATE TABLE public.online_users (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    user_name TEXT NOT NULL,
    user_avatar_url TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_user_id ON public.messages(user_id);
CREATE INDEX idx_message_status_message_id ON public.message_status(message_id);
CREATE INDEX idx_message_status_user_id ON public.message_status(user_id);
CREATE INDEX idx_online_users_is_online ON public.online_users(is_online);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Anyone can read messages" ON public.messages
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for message_status
CREATE POLICY "Anyone can read message status" ON public.message_status
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert message status" ON public.message_status
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message status" ON public.message_status
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for online_users
CREATE POLICY "Anyone can read online users" ON public.online_users
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own online status" ON public.online_users
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own online status" ON public.online_users
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own online status" ON public.online_users
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update message status to delivered for all online users
CREATE OR REPLACE FUNCTION update_message_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert delivery status for all online users except the sender
    INSERT INTO public.message_status (message_id, user_id, status)
    SELECT NEW.id, ou.user_id, 'delivered'
    FROM public.online_users ou
    WHERE ou.is_online = true 
    AND ou.user_id != NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update delivery status
CREATE TRIGGER trigger_update_message_delivery_status
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_delivery_status();

-- Function to update user's last seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.online_users (user_id, user_name, last_seen, is_online)
    VALUES (NEW.user_id, NEW.user_name, NOW(), true)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        last_seen = NOW(),
        is_online = true,
        user_name = NEW.user_name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last seen when user sends a message
CREATE TRIGGER trigger_update_user_last_seen
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_seen();

-- Function to clean up old online status (users offline for more than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_offline_users()
RETURNS void AS $$
BEGIN
    UPDATE public.online_users 
    SET is_online = false 
    WHERE last_seen < NOW() - INTERVAL '5 minutes' 
    AND is_online = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert some sample data for testing
INSERT INTO public.messages (content, user_id, user_name) VALUES 
('Welcome to the public chat! 👋', '00000000-0000-0000-0000-000000000000', 'System'),
('Feel free to start chatting with everyone!', '00000000-0000-0000-0000-000000000000', 'System');