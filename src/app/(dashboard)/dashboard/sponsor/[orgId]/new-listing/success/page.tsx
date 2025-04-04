'use client';

import { CheckCircle2, ArrowRight, FileText, Upload, FileCheck, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ListingSubmissionSuccess() {
    const params = useParams();
    const orgId = params?.orgId as string;
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const nextSteps = [
        {
            icon: FileText,
            title: 'Review Listing Details',
            description: 'Review all listing details for accuracy and completeness',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            icon: Upload,
            title: 'Upload Documents',
            description: 'Upload all required supporting documents and materials',
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
        },
        {
            icon: FileCheck,
            title: 'Generate Documents',
            description: 'Generate and review listing documents for submission',
            color: 'text-green-600',
            bgColor: 'bg-green-50'
        },
        {
            icon: Send,
            title: 'Submit for Approval',
            description: 'Submit the completed listing for final approval',
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <style jsx global>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .animate-fade-in-up {
                    opacity: 0;
                    animation: fadeInUp 0.5s ease-out forwards;
                }
                .animate-scale-in {
                    opacity: 0;
                    animation: scaleIn 0.5s ease-out forwards;
                }
                .animate-slide-in-right {
                    opacity: 0;
                    animation: slideInRight 0.5s ease-out forwards;
                }
            `}</style>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`bg-white rounded-2xl shadow-xl overflow-hidden animate-scale-in`} style={{ animationDelay: '0.1s' }}>
                    {/* Success Header */}
                    <div className="px-8 pt-8 pb-6 text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 animate-scale-in" style={{ animationDelay: '0.3s' }}>
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h1 className="mt-4 text-3xl font-bold text-gray-900 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                            Listing Created Successfully
                        </h1>
                        <p className="mt-2 text-lg text-gray-600 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                            Your listing has been successfully created and saved as a draft.
                        </p>
                    </div>

                    {/* Next Steps */}
                    <div className="px-8 py-6 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Next Steps</h2>
                        <div className="space-y-4">
                            {nextSteps.map((step, index) => {
                                const Icon = step.icon;
                                return (
                                    <div
                                        key={step.title}
                                        className={`${step.bgColor} rounded-lg p-4 flex items-start space-x-4 animate-slide-in-right`}
                                        style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                                    >
                                        <div className={`${step.color} mt-1`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-gray-900">{step.title}</h3>
                                            <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-8 py-6 bg-white border-t border-gray-100">
                        <div className="flex justify-between items-center">
                            <Link
                                href={`/dashboard/sponsor/${orgId}/listings`}
                                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
                            >
                                Return to Listings
                            </Link>
                            <div className="animate-slide-in-right" style={{ animationDelay: '1s' }}>
                                <Link
                                    href={`/dashboard/sponsor/${orgId}/listings`}
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                                >
                                    Continue to Listing Management
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 