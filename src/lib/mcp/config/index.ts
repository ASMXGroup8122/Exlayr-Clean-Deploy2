import { SupabaseMCPConfig } from './supabase';

// Define the base MCP configuration interface
export interface MCPConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'supabase' | 'postgres' | 'mysql' | 'mongodb';
  config: Record<string, any>;
}

// Define the complete MCP configuration type
export interface MCPConfigurations {
  supabase: SupabaseMCPConfig;
  // Add other MCP types as needed
}

// Export the MCP configuration object
export const mcpConfig: MCPConfigurations = {
  supabase: {
    id: 'supabase',
    name: 'Supabase MCP',
    description: 'Supabase Model Context Protocol integration',
    enabled: true,
    type: 'supabase',
    config: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    roles: {
      admin: ['*'],
      user: ['read', 'write'],
      guest: ['read'],
    },
  },
};

// Export helper functions
export function getMCPConfig<T extends keyof MCPConfigurations>(type: T): MCPConfigurations[T] {
  return mcpConfig[type];
}

export function isMCPEnabled(type: keyof MCPConfigurations): boolean {
  return mcpConfig[type]?.enabled ?? false;
}

export * from './supabase'; 