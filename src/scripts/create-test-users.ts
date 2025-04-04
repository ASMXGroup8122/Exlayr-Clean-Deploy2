const testConfig = require('../lib/test-config');

async function createIssuerUser() {
    const issuerUser = {
        email: 'issuer@example.com',
        password: 'issuer123',
        metadata: {
            role: 'issuer',
            first_name: 'Issuer',
            last_name: 'User',
            company_name: 'Test Issuer Inc'
        }
    };

    console.log(`Creating issuer user: ${issuerUser.email}`);
    const { data, error } = await testConfig.supabase.auth.signUp({
        email: issuerUser.email,
        password: issuerUser.password,
        options: {
            data: issuerUser.metadata
        }
    });

    if (error) {
        console.error(`Failed to create issuer user:`, error.message);
    } else {
        console.log(`Successfully created issuer user`);
    }
}

createIssuerUser().catch(console.error);