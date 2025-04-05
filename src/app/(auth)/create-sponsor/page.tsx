'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRegistration } from '@/hooks/useRegistration';
import { Building2, Mail, Phone, MapPin, Globe, FileText, Linkedin, Instagram, User as UserIcon, Shield, X, Check } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getSupabaseClient } from '@/lib/supabase/client';

type SponsorFormData = {
    sponsor_name: string;
    phone_number: string;
    sponsor_email: string;
    sponsor_address: string;
    contact_name: string;
    regulated_no: string;
    regulator: string;
    specialities: string[];
    website: string;
    linkedin: string;
    instagram: string;
};

export default function CreateSponsorPage() {
    const supabase = getSupabaseClient();
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const { handleRegistration, isSubmitting, registrationStatus } = useRegistration();
    
    // Get session on mount
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
            }
        };
        getSession();
    }, [supabase.auth]);

    const [formData, setFormData] = useState<SponsorFormData>({
        sponsor_name: '',
        phone_number: '',
        sponsor_email: '',  // Will be set when we get the user
        sponsor_address: '',
        contact_name: '',
        regulated_no: '',
        regulator: '',
        specialities: [],
        website: '',
        linkedin: '',
        instagram: ''
    });

    // Update email when user is set
    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({
                ...prev,
                sponsor_email: user.email || '' // Ensure it's always a string
            }));
        }
    }, [user]);

    const [error, setError] = useState<string | null>(null);

    const handleSpecialitiesChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const specialities = e.target.value.split(',').map(item => item.trim());
        setFormData({ ...formData, specialities });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError('User session not found');
            return;
        }

        if (!user.email) {
            setError('User email not found');
            return;
        }

        try {
            await handleRegistration({
                email: user.email,
                role: 'sponsor',
                organizationName: formData.sponsor_name,
                tableName: 'exchange_sponsor',
                formData,
                onSuccess: () => router.push('/registration-pending'),
                onError: (error) => setError(error.message)
            });
        } catch (error) {
            setError(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    };

    return (
        <div className="absolute inset-0 bg-gray-100 overflow-auto">
            {/* Header */}
            <div className="bg-white p-4 w-full shadow-sm">
                <div className="max-w-[1400px] mx-auto w-full px-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        Create New Sponsor Organization
                    </h2>
                    <p className="text-sm text-gray-600 ml-8">
                        Please provide your organization details for approval
                    </p>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-[1400px] mx-auto w-full p-4">
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md">
                        {error}
                    </div>
                )}

                {/* Status Indicator */}
                {registrationStatus.step !== 'idle' && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-md">
                        <p className="text-blue-700 font-medium">
                            {registrationStatus.message}
                        </p>
                        <div className="mt-2 h-2 bg-blue-100 rounded-full">
                            <div 
                                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                style={{ 
                                    width: `${
                                        registrationStatus.step === 'verifying_session' ? '25%' :
                                        registrationStatus.step === 'checking' ? '50%' :
                                        registrationStatus.step === 'creating_org' ? '75%' :
                                        registrationStatus.step === 'updating_profile' ? '90%' :
                                        registrationStatus.step === 'complete' ? '100%' :
                                        '0%'
                                    }`
                                }}
                            />
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
                            <div className="space-y-8">
                                {/* Basic Information */}
                                <div>
                                    <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-gray-900">
                                        <UserIcon className="h-5 w-5 text-blue-600" />
                                        Basic Information
                                    </h3>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Sponsor Name
                                            </label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Building2 className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.sponsor_name}
                                                    onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">
                                                Contact Name
                                            </label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.contact_name}
                                                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Email</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="email"
                                                    required
                                                    disabled
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                                    value={formData.sponsor_email}
                                                />
                                            </div>
                                            <p className="mt-1 text-sm text-gray-500">
                                                Using email from your account
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Phone className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    required
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.phone_number}
                                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Regulatory Information */}
                                <div>
                                    <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-gray-900">
                                        <Shield className="h-5 w-5 text-blue-600" />
                                        Regulatory Information
                                    </h3>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Regulator</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <UserIcon className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.regulator}
                                                    onChange={(e) => setFormData({ ...formData, regulator: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Regulation Number</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FileText className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                    value={formData.regulated_no}
                                                    onChange={(e) => setFormData({ ...formData, regulated_no: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
                            <div className="space-y-8">
                                {/* Contact Information */}
                                <div>
                                    <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-gray-900">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                        Contact Information
                                    </h3>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Address</label>
                                            <textarea
                                                required
                                                rows={3}
                                                className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                value={formData.sponsor_address}
                                                onChange={(e) => setFormData({ ...formData, sponsor_address: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Specialities</label>
                                            <textarea
                                                rows={3}
                                                className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="e.g., IPO, M&A, Private Equity"
                                                onChange={(e) => handleSpecialitiesChange(e)}
                                            />
                                            <p className="mt-1 text-sm text-gray-500">
                                                Separate multiple specialities with commas
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Online Presence */}
                                <div>
                                    <h3 className="text-lg font-medium mb-6 flex items-center gap-2 text-gray-900">
                                        <Globe className="h-5 w-5 text-blue-600" />
                                        Online Presence
                                    </h3>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Website</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Globe className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="url"
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="https://example.com"
                                                    value={formData.website}
                                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Linkedin className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="url"
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="https://linkedin.com/company/..."
                                                    value={formData.linkedin}
                                                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Instagram</label>
                                            <div className="mt-1 relative rounded-md shadow-sm">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Instagram className="h-5 w-5 text-gray-400" />
                                                </div>
                                                <input
                                                    type="url"
                                                    className="pl-10 block w-full rounded-md border border-gray-200 shadow-sm px-4 py-3 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="https://instagram.com/..."
                                                    value={formData.instagram}
                                                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="bg-white p-6 shadow-md mt-6 rounded-lg border border-gray-100 flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Submit for Approval
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 