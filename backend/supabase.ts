import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://stsrdiumhuaezeurojks.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0c3JkaXVtaHVhZXpldXJvamtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyODMwODMsImV4cCI6MjA2MDg1OTA4M30.IWe-RPIsj8XE4TucaJJBzZWig_W1tb9gaf_LUU-2ZCU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
