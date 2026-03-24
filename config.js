// 透過 CDN 引入 Supabase 核心套件
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 統一集中管理你的金鑰
const supabaseUrl = 'https://gqxvgwpccydkktavblao.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeHZnd3BjY3lka2t0YXZibGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNDc4MDYsImV4cCI6MjA4OTkyMzgwNn0.nikwxfuqc2WMlytVrnfLeBsqWOySN0_WSYFqKjM6yvM'

// 建立連線並匯出 (export)，讓其他檔案可以使用這個 supabase 變數
export const supabase = createClient(supabaseUrl, supabaseKey)
