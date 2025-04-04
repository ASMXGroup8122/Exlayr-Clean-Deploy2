const TestConfig = require('../lib/test-config');

async function testAuthentication() {
    const testUsers = [
        { email: 'admin@example.com', password: 'admin123', role: 'admin' },
        { email: 'sponsor@example.com', password: 'sponsor123', role: 'sponsor' },
        { email: 'exchange@example.com', password: 'exchange123', role: 'exchange' },
        { email: 'issuer@example.com', password: 'issuer123', role: 'issuer' },
    ];

    for (const user of testUsers) {
        console.log(`Testing ${user.role} login...`);
        
        try {
            // Sign in
            const { data, error } = await TestConfig.supabase.auth.signInWithPassword({
                email: user.email,
                password: user.password,
            });

            if (error) {
                console.error(`❌ ${user.role} login failed:`, error.message);
                continue;
            }

            if (data.user) {
                console.log(`✅ ${user.role} login successful`);
                console.log('User metadata:', data.user.user_metadata);
                
                // Test session
                const session = await TestConfig.supabase.auth.getSession();
                console.log('Session valid:', !!session.data.session);

                // Sign out
                await TestConfig.supabase.auth.signOut();
                console.log(`✅ ${user.role} sign out successful`);
            }
        } catch (error) {
            console.error(`❌ Unexpected error for ${user.role}:`, error);
        }

        console.log('-------------------');
    }
}

testAuthentication().catch(console.error);