'use client';

import { Building2, Clock } from 'lucide-react';
import Link from 'next/link';

export default function IssuerSubmissionSuccess() {
    return (
        <div className="absolute inset-0 bg-gray-100 overflow-auto">
            <div className="bg-white p-4 w-full shadow-sm">
                <div className="max-w-[1400px] mx-auto w-full px-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        Issuer Application Submitted
                    </h2>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto w-full p-4">
                <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <Clock className="h-16 w-16 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                            Application Under Review
                        </h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                            Thank you for submitting your issuer application. Our team is currently reviewing your submission.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg mt-6">
                            <h4 className="text-sm font-medium text-blue-800">What happens next?</h4>
                            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
                                <li>Our compliance team will review your application</li>
                                <li>You will receive email updates on the progress</li>
                                <li>Additional information may be requested if needed</li>
                                <li>Approval typically takes 2-3 business days</li>
                            </ul>
                        </div>
                        <div className="mt-8 space-y-4">
                            <Link 
                                href="/dashboard"
                                className="inline-block px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Go to Dashboard
                            </Link>
                            <p className="text-sm text-gray-500">
                                Questions? Contact our support team
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 
