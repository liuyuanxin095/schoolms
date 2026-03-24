import { createClient } from '@supabase/supabase-js'

// 替換成您剛剛在後台複製的 URL 與 anon key
const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM'

// 建立並匯出 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseKey)
