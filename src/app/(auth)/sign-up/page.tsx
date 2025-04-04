'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { User, Mail, Building2, Lock } from 'lucide-react';

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        first_name: '',
        last_name: '',
        company_name: '',
        phone_number: '',
        account_type: '' as 'issuer' | 'exchange_sponsor' | 'exchange'
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const { basicSignUp } = useAuth();
    const [hydrated, setHydrated] = useState(false);

    // This effect runs once after hydration is complete
    useEffect(() => {
        setHydrated(true);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        console.log('Form submitted with data:', formData);

        if (formData.password !== formData.confirmPassword) {
            setFormError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            console.log('Calling basicSignUp...');
            const response = await basicSignUp({
                email: formData.email,
                password: formData.password,
                first_name: formData.first_name,
                last_name: formData.last_name,
                company_name: formData.company_name,
                phone_number: formData.phone_number,
                account_type: formData.account_type
            });
            console.log('basicSignUp completed, response:', response);
            
            // The AuthContext will handle the redirect
        } catch (error) {
            console.error('Sign-up error:', error);
            setFormError(error instanceof Error ? error.message : 'Failed to sign up. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // If not hydrated yet, render a simple loading state or nothing
    if (!hydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-full max-w-md p-8 m-4 bg-blue-700 rounded-lg shadow-lg">
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 m-4 bg-blue-700 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-white text-center mb-2">
                    Create an Account
                </h1>
                <p className="text-white text-center mb-8">
                    Join Exlayr to start managing your listings
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-3 text-sm">
                            {formError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                First Name
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                Last Name
                            </label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Company Name
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Building2 className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.company_name}
                                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                suppressHydrationWarning
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Account Type
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <select
                                required
                                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.account_type}
                                onChange={(e) => setFormData({ ...formData, account_type: e.target.value as 'issuer' | 'exchange_sponsor' | 'exchange' })}
                                suppressHydrationWarning
                            >
                                <option value="">Select Account Type</option>
                                <option value="issuer">Issuer</option>
                                <option value="exchange_sponsor">Exchange Sponsor</option>
                                <option value="exchange">Exchange</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Email Address
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                required
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                suppressHydrationWarning
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Phone Number (optional)
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <input
                                type="tel"
                                className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                suppressHydrationWarning
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Password
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                required
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                suppressHydrationWarning
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Confirm Password
                        </label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                required
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                suppressHydrationWarning
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-blue-700 px-4 py-2 rounded hover:bg-gray-100 disabled:opacity-50"
                        suppressHydrationWarning
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                                <span className="ml-2">Creating Account...</span>
                            </div>
                        ) : (
                            'Create Account'
                        )}
                    </button>

                    <div className="text-center">
                        <Link
                            href="/sign-in"
                            className="text-sm text-white hover:text-blue-200"
                        >
                            Already have an account? Sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}