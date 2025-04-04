'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useListing } from '@/contexts/ListingContext';

interface Director {
    name: string;
    position: string;
    background: string;
    pep_status: boolean;
}

export default function DirectorDueDiligencePage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { orgId, listingId } = params as { orgId: string; listingId: string };
    const { formData, updateDueDiligence } = useListing();

    const [directors, setDirectors] = useState<Director[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || user.account_type !== 'exchange_sponsor') {
            router.replace('/sign-in');
            return;
        }

        const fetchDirectors = async () => {
            const { data, error } = await supabase
                .from('listing')
                .select('director_due_diligence')
                .eq('id', listingId)
                .single();

            if (error) {
                console.error('Error fetching directors:', error);
                return;
            }

            if (data?.director_due_diligence?.directors) {
                setDirectors(data.director_due_diligence.directors);
            }
            setIsLoading(false);
        };

        fetchDirectors();
    }, [user, listingId, router]);

    const addDirector = () => {
        const newDirector: Director = {
            name: '',
            position: '',
            background: '',
            pep_status: false
        };
        setDirectors([...directors, newDirector]);
    };

    const removeDirector = (index: number) => {
        setDirectors(directors.filter((_, i) => i !== index));
    };

    const updateDirector = (index: number, field: keyof Director, value: string | boolean) => {
        const updatedDirectors = directors.map((director, i) => {
            if (i === index) {
                return { ...director, [field]: value };
            }
            return director;
        });
        setDirectors(updatedDirectors);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Update local context
            updateDueDiligence('director', { directors });

            // Update database
            const { error } = await supabase
                .from('listing')
                .update({
                    director_due_diligence: { directors }
                })
                .eq('id', listingId);

            if (error) throw error;

            // Navigate to next section
            router.push(`/dashboard/sponsor/${orgId}/listings/${listingId}/due-diligence/industry`);
        } catch (error) {
            console.error('Error saving director due diligence:', error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Director Due Diligence</h1>
                    <p className="text-gray-500">
                        Add information about the directors of the company
                    </p>
                </div>
                <Link
                    href={`/dashboard/sponsor/${orgId}/listings`}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Listings
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {directors.map((director, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Director {index + 1}</h3>
                            <button
                                type="button"
                                onClick={() => removeDirector(index)}
                                className="text-red-600 hover:text-red-900"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={director.name}
                                    onChange={(e) => updateDirector(index, 'name', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Position
                                </label>
                                <input
                                    type="text"
                                    value={director.position}
                                    onChange={(e) => updateDirector(index, 'position', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Background
                                </label>
                                <textarea
                                    value={director.background}
                                    onChange={(e) => updateDirector(index, 'background', e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="col-span-2">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={director.pep_status}
                                        onChange={(e) => updateDirector(index, 'pep_status', e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 block text-sm text-gray-900">
                                        Politically Exposed Person (PEP)
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addDirector}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Director
                </button>

                <div className="flex justify-end space-x-4">
                    <Link
                        href={`/dashboard/sponsor/${orgId}/listings/${listingId}`}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                </div>
            </form>
        </div>
    );
} 