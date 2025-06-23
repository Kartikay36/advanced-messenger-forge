
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          phone: string | null;
          is_online: boolean;
          last_seen: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          phone?: string | null;
          is_online?: boolean;
          last_seen?: string | null;
        };
        Update: {
          full_name?: string;
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          phone?: string | null;
          is_online?: boolean;
          last_seen?: string | null;
        };
      };
      conversations: {
        Row: {
          id: string;
          name: string | null;
          is_group: boolean;
          avatar_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name?: string | null;
          is_group?: boolean;
          avatar_url?: string | null;
          created_by: string;
        };
        Update: {
          name?: string | null;
          avatar_url?: string | null;
        };
      };
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          conversation_id: string;
          user_id: string;
          role?: 'admin' | 'member';
        };
        Update: {
          role?: 'admin' | 'member';
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          message_type: 'text' | 'image' | 'file' | 'voice' | 'video';
          file_url: string | null;
          file_name: string | null;
          file_size: number | null;
          reply_to: string | null;
          is_edited: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          message_type?: 'text' | 'image' | 'file' | 'voice' | 'video';
          file_url?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          reply_to?: string | null;
        };
        Update: {
          content?: string | null;
          is_edited?: boolean;
          is_deleted?: boolean;
        };
      };
    };
  };
};
