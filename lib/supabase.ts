import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zbkgerbdnjmctqqnoqnd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpia2dlcmJkbmptY3RxcW5vcW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg4MDB9.placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);
