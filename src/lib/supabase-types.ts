export type ExchangeSponsor = {
    id: string;
    sponsor_name: string;
    phone_number: string;
    sponsor_email: string;
    sponsor_address: string;
    contact_name: string;
    regulated_no: string;
    regulator: string;
    specialities: string[];
    website: string;
    issuers: any; // JSONB type
    linkedin: string;
    instagram: string;
    x_twitter: string;
    created_at: string;
    updated_at: string;
}

export type Exchange = {
    id: string;
    exchange_name: string;
    jurisdiction: string;
    phone_number: string;
    website: string;
    contact_emails: string;
    custody: string;
    clearing: string;
    listing_rules: string;
    other_listing_docs: string;
    regulator: string;
    status: 'pending' | 'active' | 'suspended';
    rejection_reason?: string;
    linkedin: string;
    instagram: string;
    instagram_copy: string;
    x_twitter: string;
    exchange_address: string;
    recordid: string;
    created_at: string;
    updated_at: string;
}

export type User = {
    id: string;
    email: string;
    role: 'admin' | 'sponsor' | 'exchange' | 'issuer';
    first_name: string;
    last_name: string;
    company_name: string;
    phone_number: string | null;
    status: 'pending' | 'active' | 'suspended';
    last_login: string | null;
    created_at: string;
    updated_at: string;
}

export type Permission = {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export type Document = {
    id: string;
    name: string;
    type: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected';
    entity_type: 'issuer' | 'sponsor' | 'exchange' | 'listing';
    entity_id: string;
    storage_path: string;
    uploaded_by: string;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
}

export type Notification = {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    read: boolean;
    action_url: string | null;
    created_at: string;
}

export type AccountType = 'admin' | 'exchange_sponsor' | 'exchange' | 'issuer';

export interface Database {
    public: {
        Tables: {
            exchange_sponsor: {
                Row: ExchangeSponsor;
                Insert: Omit<ExchangeSponsor, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<ExchangeSponsor, 'id'>>;
            };
            exchange: {
                Row: Exchange;
                Insert: Omit<Exchange, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Exchange, 'id'>>;
            };
            // users: {
            //     Row: User;
            //     Insert: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>;
            //     Update: Partial<Omit<User, 'id'>>;
            // };
            permissions: {
                Row: Permission;
                Insert: Omit<Permission, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Permission, 'id'>>;
            };
            documents: {
                Row: Document;
                Insert: Omit<Document, 'id' | 'created_at' | 'updated_at' | 'approved_at'>;
                Update: Partial<Omit<Document, 'id'>>;
            };
            notifications: {
                Row: Notification;
                Insert: Omit<Notification, 'id' | 'created_at'>;
                Update: Partial<Omit<Notification, 'id'>>;
            };
            users: {
                Row: {
                    id: string;
                    account_type: AccountType;
                    // ... other fields
                };
                Insert: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>;
                Update: Partial<Omit<User, 'id'>>;
            };
        };
    };
    auth: {
        Tables: {
            users: {
                Row: User;
                Insert: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login'>;
                Update: Partial<Omit<User, 'id'>>;
            };
        };
    };
};

export interface IssuerDetails {
    // ... existing fields ...

    // New Status and Approval Fields
    status: 'pending' | 'approved' | 'rejected';
    approved_at: string | null;
    approved_by: string | null;  // UUID
    rejection_reason: string | null;
    rejected_at: string | null;
    rejected_by: string | null;  // UUID
    created_by: string | null;   // UUID
}

// New interface for status changes
export interface IssuerStatusChange {
    id: string;
    issuer_id: string;
    old_status: 'pending' | 'approved' | 'rejected';
    new_status: 'pending' | 'approved' | 'rejected';
    changed_by: string;  // UUID
    changed_at: string;
    reason: string | null;
    metadata: Record<string, any> | null;
}

type OrganizationRole = 'org_admin' | 'org_member' | 'org_pending'; 