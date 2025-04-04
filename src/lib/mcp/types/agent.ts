import { MCPConfig, MCPConfigurations } from '../config';

// Define the base agent state
export interface AgentState {
  isInitialized: boolean;
  isConnected: boolean;
  lastError?: Error;
  lastSync?: Date;
}

// Define the base agent configuration
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  mcpType: keyof MCPConfigurations;
  permissions: string[];
}

// Define the base agent interface
export interface Agent {
  config: AgentConfig;
  state: AgentState;
  
  // Lifecycle methods
  initialize(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // State management
  getState(): AgentState;
  resetState(): void;
  
  // Error handling
  handleError(error: Error): void;
  
  // Utility methods
  isReady(): boolean;
  getCapabilities(): string[];
  
  // Custom methods can be added by extending agents
}

// Define the agent factory interface
export interface AgentFactory {
  createAgent(config: AgentConfig): Agent;
}

// Define the agent manager interface
export interface AgentManager {
  agents: Map<string, Agent>;
  
  // Agent lifecycle management
  registerAgent(agent: Agent): void;
  unregisterAgent(agentId: string): void;
  getAgent(agentId: string): Agent | undefined;
  
  // Bulk operations
  initializeAll(): Promise<void>;
  disconnectAll(): Promise<void>;
  
  // State management
  getAgentStates(): Record<string, AgentState>;
} 