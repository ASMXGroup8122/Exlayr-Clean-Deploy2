'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { UserCircle, Mail, Phone, Building2, MapPin, Calendar } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Profile</h1>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    {isEditing ? 'Save Changes' : 'Edit Profile'}
                </button>
            </div>

            <div className="bg-white shadow rounded-lg">
                {/* Profile Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCircle className="h-12 w-12 text-blue-600" />
                        </div>
                        <div className="ml-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {user?.first_name} {user?.last_name}
                            </h2>
                            <p className="text-gray-500">{user?.role.charAt(0).toUpperCase() + user?.role.slice(1)}</p>
                        </div>
                    </div>
                </div>

                {/* Profile Information */}
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Personal Information</h3>
                            
                            <div className="flex items-center space-x-3">
                                <Mail className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={user?.email}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                            disabled
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user?.email}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Phone className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            value={user?.phone_number || ''}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user?.phone_number || 'Not set'}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Company Information */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Company Information</h3>
                            
                            <div className="flex items-center space-x-3">
                                <Building2 className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Company</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={user?.company_name || ''}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user?.company_name || 'Not set'}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <MapPin className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Location</p>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={user?.location || ''}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                        />
                                    ) : (
                                        <p className="text-gray-900">{user?.location || 'Not set'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Information */}
                    <div className="pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-medium mb-4">Account Information</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center space-x-3">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Member Since</p>
                                    <p className="text-gray-900">
                                        {new Date(user?.created_at || '').toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Last Login</p>
                                    <p className="text-gray-900">
                                        {new Date(user?.last_login || '').toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 
