import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rthxlprgtfuhntpcdhsh.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0aHhscHJndGZ1aG50cGNkaHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDkzNTUsImV4cCI6MjA5MzkyNTM1NX0.men8PNFnr8Na3H53pjX4dzg9FGQH8dCNefVKti5M-UM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
