import { MCPConfig } from './index';

// Define Supabase-specific role permissions
export type SupabasePermission = 'read' | 'write' | 'delete' | '*';

// Define role-based access control for Supabase
export interface SupabaseRBAC {
  [role: string]: SupabasePermission[];
}

// Define Supabase-specific configuration
export interface SupabaseMCPConfig extends MCPConfig {
  type: 'supabase';
  config: {
    url: string | undefined;
    anonKey: string | undefined;
    serviceRole: string | undefined;
  };
  roles: SupabaseRBAC;
}

// Define Supabase query builder types
export interface SupabaseQueryBuilder {
  select: (columns: string) => SupabaseQueryBuilder;
  from: (table: string) => SupabaseQueryBuilder;
  where: (column: string, operator: string, value: any) => SupabaseQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder;
  limit: (count: number) => SupabaseQueryBuilder;
  single: () => Promise<any>;
  execute: () => Promise<any[]>;
}

// Define Supabase client configuration
export interface SupabaseClientConfig {
  auth: {
    persistSession: boolean;
    detectSessionInUrl: boolean;
    autoRefreshToken: boolean;
    multiTab: boolean;
  };
  db: {
    schema: string;
  };
  global: {
    headers: Record<string, string>;
  };
} 