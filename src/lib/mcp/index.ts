import { MCPAgentManager } from './agents/manager';
import { SupabaseAgent } from './agents/supabase';
import { mcpConfig, MCPConfigurations } from './config';
import type { Agent, AgentConfig, AgentState } from './types/agent';
import type { SupabaseMCPConfig, SupabasePermission } from './config/supabase';

// Create a singleton instance of the agent manager
export const agentManager = new MCPAgentManager();

// Initialize default agents
const supabaseAgent = new SupabaseAgent({
  id: 'supabase',
  name: 'Supabase MCP',
  description: 'Supabase Model Context Protocol integration',
  version: '1.0.0',
  mcpType: 'supabase' as keyof MCPConfigurations,
  permissions: ['read', 'write', 'delete'],
});

// Register default agents
agentManager.registerAgent(supabaseAgent);

// Export types
export type {
  Agent,
  AgentConfig,
  AgentState,
  SupabaseMCPConfig,
  SupabasePermission,
};

// Export classes
export { MCPAgentManager } from './agents/manager';
export { SupabaseAgent } from './agents/supabase';
export { BaseAgent } from './agents/base';

// Export configuration
export { mcpConfig, getMCPConfig, isMCPEnabled } from './config'; 