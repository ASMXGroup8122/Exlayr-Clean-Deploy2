import { Database } from '@/lib/supabase-types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState } from 'react';

interface RegistrationData {
    email: string;
    role: 'sponsor' | 'issuer' | 'exchange';
    organizationName: string;
    tableName: 'exchange_sponsor' | 'issuers' | 'exchanges';
    formData: Record<string, any>;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

interface RegistrationStatus {
    step: 'idle' | 'verifying_session' | 'checking' | 'creating_org' | 'updating_profile' | 'complete';
    message: string;
}

export const useRegistration = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>({
        step: 'idle',
        message: ''
    });

    const supabase = createClientComponentClient();

    const handleRegistration = async ({
        email,
        role,
        organizationName,
        tableName,
        formData,
        onSuccess,
        onError
    }: RegistrationData) => {
        console.log('🔄 useRegistration - Starting registration process with:', {
            email,
            role,
            organizationName,
            tableName
        });
        
        setIsSubmitting(true);
        try {
            // 1. Verify active session first
            setRegistrationStatus({ 
                step: 'verifying_session', 
                message: 'Verifying session...' 
            });
            console.log('🔄 useRegistration - Verifying session');

            const { data: { session } } = await supabase.auth.getSession();
            console.log('🔄 useRegistration - Session result:', session);
            
            if (!session) {
                console.error('🔄 useRegistration - No active session found');
                throw new Error('No active session. Please sign in first.');
            }

            const currentUser = session.user;
            console.log('🔄 useRegistration - Current user:', currentUser);

            // 2. Create or get user profile
            setRegistrationStatus({ 
                step: 'checking', 
                message: 'Setting up user profile...' 
            });
            console.log('🔄 useRegistration - Checking for existing profile');

            // Try to get existing profile
            const { data: existingProfile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUser.id)
                .maybeSingle();
                
            console.log('🔄 useRegistration - Existing profile result:', existingProfile);
            if (profileError) {
                console.error('🔄 useRegistration - Error fetching profile:', profileError);
            }

            if (!existingProfile) {
                console.log('🔄 useRegistration - Creating new profile');
                // Create new profile if doesn't exist
                const { error: createProfileError } = await supabase
                    .from('users')
                    .insert([{
                        id: currentUser.id,
                        email: currentUser.email,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);

                if (createProfileError) {
                    console.error('🔄 useRegistration - Profile creation error:', createProfileError);
                    throw new Error('Failed to create user profile');
                }
                console.log('🔄 useRegistration - New profile created successfully');
            } else if (existingProfile.organization_id) {
                console.error('🔄 useRegistration - User already has an organization');
                throw new Error('You already have an organization. Please use a different account.');
            }

            // 3. Create organization record
            setRegistrationStatus({ 
                step: 'creating_org', 
                message: 'Creating organization...' 
            });
            console.log('🔄 useRegistration - Creating organization record');

            // Set the correct name field based on organization type
            const nameField = tableName === 'exchange_sponsor' ? 'sponsor_name' : 
                            tableName === 'issuers' ? 'issuer_name' : 
                            tableName === 'exchanges' ? 'exchange_name' : 'name';

            const { data: orgData, error: insertError } = await supabase
                .from(tableName)
                .insert([{
                    ...formData,
                    [nameField]: organizationName,
                    user_id: currentUser.id,
                    admin_user_id: currentUser.id,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (insertError) {
                console.error('🔄 useRegistration - Organization creation error:', insertError);
                throw new Error('Failed to create organization');
            }

            // Update user profile with organization ID and admin status
            setRegistrationStatus({ 
                step: 'updating_profile', 
                message: 'Updating profile...' 
            });
            console.log('🔄 useRegistration - Updating user profile');

            const { error: profileUpdateError } = await supabase
                .from('users')
                .update({ 
                    organization_id: orgData.id,
                    account_type: role === 'sponsor' ? 'exchange_sponsor' : role,
                    status: 'pending',
                    is_org_admin: true, // Set as organization admin
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentUser.id);

            if (profileUpdateError) {
                console.error('🔄 useRegistration - Profile update error:', profileUpdateError);
                // Cleanup the organization if profile update fails
                console.log('🔄 useRegistration - Cleaning up organization due to profile update failure');
                await supabase
                    .from(tableName)
                    .delete()
                    .eq('id', orgData.id);
                throw new Error('Failed to update user profile');
            }
            console.log('🔄 useRegistration - Profile updated successfully');

            setRegistrationStatus({ 
                step: 'complete', 
                message: 'Registration complete!' 
            });
            console.log('🔄 useRegistration - Registration process completed successfully');

            // 5. Redirect to approval pending page
            if (onSuccess) {
                onSuccess();
            }

        } catch (error) {
            console.error('🔄 useRegistration - Registration error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            if (onError) {
                onError(new Error(errorMessage));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        handleRegistration,
        isSubmitting,
        registrationStatus
    };
}; 