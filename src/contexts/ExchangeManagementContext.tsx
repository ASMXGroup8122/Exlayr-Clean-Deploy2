'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { ExchangeMember, PendingApproval, MemberRole } from '@/types/exchange';
import { useAuth } from './AuthContext';

interface ExchangeManagementContextType {
    members: ExchangeMember[];
    pendingApprovals: PendingApproval[];
    isLoading: boolean;
    error: Error | null;
    fetchMembers: (exchangeId: string) => Promise<void>;
    fetchPendingApprovals: (exchangeId: string) => Promise<void>;
    approveMember: (exchangeId: string, memberId: string) => Promise<void>;
    rejectMember: (exchangeId: string, memberId: string, reason?: string) => Promise<void>;
    updateMemberRole: (exchangeId: string, memberId: string, role: MemberRole) => Promise<void>;
}

const ExchangeManagementContext = createContext<ExchangeManagementContextType | undefined>(undefined);

export function ExchangeManagementProvider({ children }: { children: React.ReactNode }) {
    const [members, setMembers] = useState<ExchangeMember[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    const supabase = createClientComponentClient();
    const { user } = useAuth();

    const fetchMembers = useCallback(async (exchangeId: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('exchange_member_view')
                .select('*')
                .eq('exchange_id', exchangeId);

            if (error) throw error;

            setMembers(data.map(member => ({
                id: member.user_id,
                email: member.email,
                firstName: member.first_name,
                lastName: member.last_name,
                status: member.status,
                role: member.member_role || 'member',
                joinedAt: new Date(member.created_at)
            })));
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch members'));
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const fetchPendingApprovals = useCallback(async (exchangeId: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('pending_exchange_approvals')
                .select('*')
                .eq('exchange_id', exchangeId);

            if (error) throw error;

            setPendingApprovals(data.map(approval => ({
                userId: approval.user_id,
                email: approval.email,
                firstName: approval.first_name,
                lastName: approval.last_name,
                requestDate: new Date(approval.request_date),
                role: 'member'
            })));
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch pending approvals'));
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    const approveMember = useCallback(async (exchangeId: string, memberId: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const { error } = await supabase.rpc('approve_exchange_member', {
                p_exchange_id: exchangeId,
                p_user_id: memberId,
                p_approver_id: user?.id
            });

            if (error) throw error;

            // Refresh lists
            await Promise.all([
                fetchMembers(exchangeId),
                fetchPendingApprovals(exchangeId)
            ]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to approve member'));
        } finally {
            setIsLoading(false);
        }
    }, [supabase, user, fetchMembers, fetchPendingApprovals]);

    const rejectMember = useCallback(async (exchangeId: string, memberId: string, reason?: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const { error } = await supabase
                .from('users')
                .update({ 
                    status: 'suspended',
                    rejection_reason: reason
                })
                .eq('id', memberId)
                .eq('organization_id', exchangeId);

            if (error) throw error;

            // Refresh lists
            await Promise.all([
                fetchMembers(exchangeId),
                fetchPendingApprovals(exchangeId)
            ]);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to reject member'));
        } finally {
            setIsLoading(false);
        }
    }, [supabase, fetchMembers, fetchPendingApprovals]);

    const updateMemberRole = useCallback(async (exchangeId: string, memberId: string, role: MemberRole) => {
        try {
            setIsLoading(true);
            setError(null);

            const { error } = await supabase
                .from('exchange_member_roles')
                .upsert({
                    exchange_id: exchangeId,
                    user_id: memberId,
                    role: role,
                    status: 'active'
                });

            if (error) throw error;

            await fetchMembers(exchangeId);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to update member role'));
        } finally {
            setIsLoading(false);
        }
    }, [supabase, fetchMembers]);

    return (
        <ExchangeManagementContext.Provider value={{
            members,
            pendingApprovals,
            isLoading,
            error,
            fetchMembers,
            fetchPendingApprovals,
            approveMember,
            rejectMember,
            updateMemberRole
        }}>
            {children}
        </ExchangeManagementContext.Provider>
    );
}

export function useExchangeManagement() {
    const context = useContext(ExchangeManagementContext);
    if (context === undefined) {
        throw new Error('useExchangeManagement must be used within an ExchangeManagementProvider');
    }
    return context;
} 