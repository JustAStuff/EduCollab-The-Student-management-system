-- Create messages table for public chat
CREATE TABLE IF NOT EXISTS public.messages (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT 'Anonymous',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages table
-- Allow everyone to read messages
CREATE POLICY "Anyone can view messages" ON public.messages
    FOR SELECT USING (true);

-- Allow everyone to insert messages
CREATE POLICY "Anyone can insert messages" ON public.messages
    FOR INSERT WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);

-- Grant permissions
GRANT ALL ON public.messages TO anon;
GRANT ALL ON public.messages TO authenticated;
GRANT USAGE ON SEQUENCE public.messages_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.messages_id_seq TO authenticated;