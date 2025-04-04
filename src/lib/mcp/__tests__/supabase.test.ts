import { agentManager, SupabaseAgent } from '..';

async function testSupabaseMCP() {
  try {
    // Get the Supabase agent
    const agent = agentManager.getAgent('supabase') as SupabaseAgent;
    if (!agent) {
      throw new Error('Supabase agent not found');
    }

    // Initialize and connect
    console.log('Initializing Supabase agent...');
    await agent.initialize();
    console.log('Connecting to Supabase...');
    await agent.connect();

    // Check if agent is ready
    console.log('Agent ready:', agent.isReady());
    console.log('Agent state:', agent.getState());

    // Try a simple query
    console.log('Executing test query...');
    const queryBuilder = await agent.query('users');
    const result = await queryBuilder
      .select('*')
      .limit(1)
      .execute();
    
    console.log('Query result:', result);

    // Check permissions
    const hasReadPermission = await agent.checkPermission('read');
    console.log('Has read permission:', hasReadPermission);

    // Disconnect
    console.log('Disconnecting...');
    await agent.disconnect();
    console.log('Final agent state:', agent.getState());

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSupabaseMCP(); 