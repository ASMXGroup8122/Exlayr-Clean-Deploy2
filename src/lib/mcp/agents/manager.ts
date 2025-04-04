import { Agent, AgentManager, AgentState } from '../types/agent';

export class MCPAgentManager implements AgentManager {
  public agents: Map<string, Agent> = new Map();

  // Agent lifecycle management
  public registerAgent(agent: Agent): void {
    if (this.agents.has(agent.config.id)) {
      throw new Error(`Agent with ID ${agent.config.id} is already registered`);
    }
    this.agents.set(agent.config.id, agent);
  }

  public unregisterAgent(agentId: string): void {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }
    this.agents.delete(agentId);
  }

  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  // Bulk operations
  public async initializeAll(): Promise<void> {
    const errors: Error[] = [];

    for (const agent of this.agents.values()) {
      try {
        await agent.initialize();
      } catch (error) {
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to initialize all agents: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  public async disconnectAll(): Promise<void> {
    const errors: Error[] = [];

    for (const agent of this.agents.values()) {
      try {
        await agent.disconnect();
      } catch (error) {
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to disconnect all agents: ${errors.map(e => e.message).join(', ')}`);
    }
  }

  // State management
  public getAgentStates(): Record<string, AgentState> {
    const states: Record<string, AgentState> = {};
    
    for (const [id, agent] of this.agents.entries()) {
      states[id] = agent.getState();
    }

    return states;
  }

  // Utility methods
  public getReadyAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(agent => agent.isReady());
  }

  public async connectAgent(agentId: string): Promise<void> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    await agent.connect();
  }

  public async disconnectAgent(agentId: string): Promise<void> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} is not registered`);
    }

    await agent.disconnect();
  }
} 