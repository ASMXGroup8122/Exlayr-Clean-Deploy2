"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import IssuerFormWizard from './IssuerFormWizard';

const CreateIssuerForSponsorPage = () => {
  const params = useParams();
  const orgId = Array.isArray(params.orgId) ? params.orgId[0] : params.orgId;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Create New Issuer</h1>
      <p className="text-gray-600 mb-6">Complete the form below to add a new issuer to your account</p>
      <IssuerFormWizard sponsorOrgId={orgId} />
    </div>
  );
};

export default CreateIssuerForSponsorPage; 