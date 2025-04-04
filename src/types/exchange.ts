export type ExchangeStatus = 'pending' | 'active' | 'suspended';
export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'pending' | 'active' | 'suspended';

export interface ExchangeMember {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: MemberStatus;
    role: MemberRole;
    joinedAt: Date;
}

export interface PendingApproval {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    requestDate: Date;
    role: MemberRole;
}

export interface ExchangeInvite {
    code: string;
    email: string;
    role: MemberRole;
    expiresAt: Date;
}

export interface Exchange {
    id: string;
    exchange_name: string;
    status: ExchangeStatus;
    created_by: string;
    created_at: Date;
    updated_at: Date;
    jurisdiction?: string;
    phone_number?: string;
    website?: string;
    contact_emails?: string;
    regulator?: string;
} 