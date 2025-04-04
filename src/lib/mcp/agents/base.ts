import { Agent, AgentConfig, AgentState } from '../types/agent';

export abstract class BaseAgent implements Agent {
  public state: AgentState = {
    isInitialized: false,
    isConnected: false,
  };

  constructor(public readonly config: AgentConfig) {}

  // Lifecycle methods
  public async initialize(): Promise<void> {
    try {
      await this.onInitialize();
      this.state.isInitialized = true;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  public async connect(): Promise<void> {
    if (!this.state.isInitialized) {
      throw new Error('Agent must be initialized before connecting');
    }

    try {
      await this.onConnect();
      this.state.isConnected = true;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.onDisconnect();
      this.state.isConnected = false;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  // State management
  public getState(): AgentState {
    return { ...this.state };
  }

  public resetState(): void {
    this.state = {
      isInitialized: false,
      isConnected: false,
    };
  }

  // Error handling
  public handleError(error: Error): void {
    this.state.lastError = error;
    this.onError(error);
  }

  // Utility methods
  public isReady(): boolean {
    return this.state.isInitialized && this.state.isConnected;
  }

  public getCapabilities(): string[] {
    return this.config.permissions;
  }

  // Abstract methods to be implemented by specific agents
  protected abstract onInitialize(): Promise<void>;
  protected abstract onConnect(): Promise<void>;
  protected abstract onDisconnect(): Promise<void>;
  protected abstract onError(error: Error): void;
} 