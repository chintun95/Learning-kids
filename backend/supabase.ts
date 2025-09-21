import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qsqirkgznjtrrafbgzvj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzcWlya2d6bmp0cnJhZmJnenZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODQyMzUsImV4cCI6MjA3NDA2MDIzNX0.V21oODApoEDdGUmwi40zXZE_FK42ZR0TGoRFNXl8uMc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
