import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BaseAgent } from './base';
import { AgentConfig } from '../types/agent';
import { getMCPConfig } from '../config';
import { SupabaseMCPConfig, SupabaseQueryBuilder, SupabasePermission } from '../config/supabase';

export class SupabaseAgent extends BaseAgent {
  private client: SupabaseClient | null = null;
  private supabaseConfig: SupabaseMCPConfig;

  constructor(agentConfig: AgentConfig) {
    super(agentConfig);
    this.supabaseConfig = getMCPConfig('supabase');
  }

  // Implement abstract methods
  protected async onInitialize(): Promise<void> {
    const { url, anonKey } = this.supabaseConfig.config;
    
    if (!url || !anonKey) {
      throw new Error('Supabase configuration is missing required fields');
    }

    try {
      this.client = createClient(url, anonKey);
      this.state.lastSync = new Date();
    } catch (error) {
      throw new Error(`Failed to initialize Supabase client: ${(error as Error).message}`);
    }
  }

  protected async onConnect(): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }

    try {
      // Test connection by making a simple query
      await this.client.from('healthcheck').select('*').limit(1);
    } catch (error) {
      throw new Error(`Failed to connect to Supabase: ${(error as Error).message}`);
    }
  }

  protected async onDisconnect(): Promise<void> {
    if (this.client) {
      await this.client.auth.signOut();
      this.client = null;
    }
  }

  protected onError(error: Error): void {
    console.error('Supabase agent error:', error);
    // Implement additional error handling if needed
  }

  // Supabase-specific methods
  public async queryTable(table: string) {
    if (!this.isReady() || !this.client) {
      throw new Error('Supabase agent is not ready');
    }

    return this.client.from(table);
  }

  public async executeRawQuery(query: string, values?: any[]): Promise<any> {
    if (!this.isReady() || !this.client) {
      throw new Error('Supabase agent is not ready');
    }

    const { data, error } = await this.client.rpc('execute_raw_query', {
      query_text: query,
      query_values: values,
    });

    if (error) {
      throw new Error(`Failed to execute raw query: ${error.message}`);
    }

    return data;
  }

  public async getUser() {
    if (!this.isReady() || !this.client) {
      throw new Error('Supabase agent is not ready');
    }

    const { data: { user }, error } = await this.client.auth.getUser();

    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return user;
  }

  public async checkPermission(permission: SupabasePermission): Promise<boolean> {
    const user = await this.getUser();
    if (!user) return false;

    const userRole = user.role || 'guest';
    const allowedPermissions = this.supabaseConfig.roles[userRole] || [];

    return allowedPermissions.includes('*') || allowedPermissions.includes(permission);
  }

  // Add a method for direct queries
  public async directQuery<T = any>(table: string) {
    if (!this.isReady() || !this.client) {
      throw new Error('Supabase agent is not ready');
    }

    return this.client.from(table);
  }
} 