export type Issuer = {
    id: string;
    name: string;
    status: 'active' | 'pending' | 'inactive';
    created_at: string;
    updated_at: string;
    // Add other fields from your issuers table
};

export type Exchange = {
    id: string;
    name: string;
    status: 'active' | 'pending' | 'inactive';
    created_at: string;
    updated_at: string;
    // Add other fields from your exchange table
};

export type Sponsor = {
    id: string;
    name: string;
    status: 'active' | 'pending' | 'inactive';
    created_at: string;
    updated_at: string;
    // Add other fields from your exchange-sponsor table
};

export type User = {
    id: string;
    email: string;
    role: 'admin' | 'sponsor' | 'exchange' | 'issuer';
    first_name: string;
    last_name: string;
    created_at: string;
    updated_at: string;
    // Add other fields from your users table
};

interface OrganizationMember {
    id: string;
    user_id: string;
    organization_id: string;
    organization_type: 'exchange_sponsor' | 'issuer';
    role: 'org_admin' | 'org_member';
    status: 'active' | 'pending';
    added_by: string;
    created_at: string;
    updated_at: string;
} 