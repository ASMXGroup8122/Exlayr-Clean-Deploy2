export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AccountType = 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer';

export interface Database {
  public: {
    Tables: {
      exchange_documents: {
        Row: {
          id: string
          exchange_id: string | null
          category: 'GENERAL' | 'LEGAL' | 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE'
          content_type: string
          text_content: string | null
          file_name: string | null
          file_path: string | null
          file_type: string | null
          file_size: number | null
          upload_date: string | null
          description: string | null
          year: number | null
          metadata: Json | null
          embedding_status: string
          created_at: string
          updated_at: string
          entity_type: string | null
          entity_id: string | null
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          uploaded_by: string | null
          approved_by: string | null
          approved_at: string | null
          storage_path: string | null
        }
        Insert: {
          id?: string
          exchange_id?: string | null
          category: 'GENERAL' | 'LEGAL' | 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE'
          content_type: string
          text_content?: string | null
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          file_size?: number | null
          upload_date?: string | null
          description?: string | null
          year?: number | null
          metadata?: Json | null
          embedding_status?: string
          created_at?: string
          updated_at?: string
          entity_type?: string | null
          entity_id?: string | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          uploaded_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          storage_path?: string | null
        }
        Update: {
          id?: string
          exchange_id?: string | null
          category?: 'GENERAL' | 'LEGAL' | 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE'
          content_type?: string
          text_content?: string | null
          file_name?: string | null
          file_path?: string | null
          file_type?: string | null
          file_size?: number | null
          upload_date?: string | null
          description?: string | null
          year?: number | null
          metadata?: Json | null
          embedding_status?: string
          created_at?: string
          updated_at?: string
          entity_type?: string | null
          entity_id?: string | null
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          uploaded_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          storage_path?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          account_type: 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer'
          status: 'pending' | 'active' | 'suspended'
          created_at: string
          updated_at: string
          metadata: Json | null
          organization_id: string | null
        }
        Insert: {
          id?: string
          email: string
          account_type: 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer'
          status?: 'pending' | 'active' | 'suspended'
          created_at?: string
          updated_at?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          account_type?: 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer'
          status?: 'pending' | 'active' | 'suspended'
          created_at?: string
          updated_at?: string
          metadata?: Json | null
          organization_id?: string | null
        }
      }
      exchange_sponsor: {
        Row: {
          id: string
          sponsor_name: string
          status: 'active' | 'pending' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sponsor_name: string
          status?: 'active' | 'pending' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sponsor_name?: string
          status?: 'active' | 'pending' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          organization_type: 'exchange_sponsor' | 'issuer'
          role: 'org_admin' | 'org_member'
          status: 'active' | 'pending'
          added_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          organization_type: 'exchange_sponsor' | 'issuer'
          role: 'org_admin' | 'org_member'
          status?: 'active' | 'pending'
          added_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          organization_type?: 'exchange_sponsor' | 'issuer'
          role?: 'org_admin' | 'org_member'
          status?: 'active' | 'pending'
          added_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 