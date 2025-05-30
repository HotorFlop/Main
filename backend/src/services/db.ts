import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const db = supabase.storage;

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  username: string;
  phone_number: string | null;
}

export interface SharedItem {
  id: number;
  createdAt: Date;
  title: string;
  description: string | null;
  imageUrl: string | null;
  url: string;
  userId: string;
  category: string | null;
  price: number | null;
  updatedAt: Date;
  yes_count: number;
  no_count: number;
  total_count: number;
}

export interface Rating {
  id: number;
  isPositive: boolean;
  createdAt: Date;
  userId: number;
  itemId: number;
}

export interface Comment {
  id: number;
  created_at: Date;
  sharedItemId: number | null;
  comment: string | null;
  userId: string | null;
}

export interface Report {
  id: number;
  created_at: Date;
  reporter_id: string;
  reported_item_id?: number | null;
  reported_comment_id?: number | null;
  reported_user_id?: string | null;
  reason: string;
  description?: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by?: string | null;
  reviewed_at?: Date | null;
}
