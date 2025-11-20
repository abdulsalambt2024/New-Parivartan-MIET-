
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://naijawgqqxluaqeuefjx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5haWphd2dxcXhsdWFxZXVlZmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0ODIyNjIsImV4cCI6MjA3OTA1ODI2Mn0.L1mo21kPjKv9HaisIWwQJQ-g2g9C_1XogHSoHvKbvjg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
