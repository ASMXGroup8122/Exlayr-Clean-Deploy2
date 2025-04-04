import { Document, IPOListing } from '@/types';

export const mockDocuments: Document[] = [
    {
        id: '1',
        name: 'Financial Statements',
        type: 'financial',
        status: 'submitted',
        dueDate: '2024-01-15',
        submittedDate: '2024-01-10',
        comments: 'Approved by audit committee'
    },
    {
        id: '2',
        name: 'Prospectus Draft',
        type: 'legal',
        status: 'in_review',
        dueDate: '2024-02-01',
        submittedDate: '2024-01-25',
        comments: 'Under legal review'
    },
    {
        id: '3',
        name: 'Corporate Governance',
        type: 'compliance',
        status: 'required',
        dueDate: '2024-02-15'
    },
    {
        id: '4',
        name: 'Board Resolutions',
        type: 'legal',
        status: 'pending',
        dueDate: '2024-02-10'
    }
];

export const mockListings: IPOListing[] = [
    {
        id: '1',
        companyName: 'Tech Corp Ltd',
        status: 'in_review',
        currentStage: 'due_diligence',
        progress: 65,
        sponsor: 'Goldman Sachs',
        submissionDate: '2024-01-01',
        targetDate: '2024-03-15',
        documents: mockDocuments
    },
    {
        id: '2',
        companyName: 'Green Energy Solutions',
        status: 'pending',
        currentStage: 'documentation',
        progress: 35,
        sponsor: 'Morgan Stanley',
        submissionDate: '2024-01-10',
        targetDate: '2024-04-01',
        documents: []
    }
];

export const mockStats = {
    totalListings: 142,
    pendingIPOs: 15,
    marketCap: '$2.4T',
    dailyVolume: '$85M',
    activeSponsors: 12,
    totalUsers: 156
};

export const mockTimeline = [
    {
        stage: 'Initial Filing',
        status: 'completed',
        date: '2024-01-01'
    },
    {
        stage: 'Documentation',
        status: 'completed',
        date: '2024-01-15'
    },
    {
        stage: 'Due Diligence',
        status: 'in_progress',
        date: '2024-02-01'
    },
    {
        stage: 'Final Approval',
        status: 'pending',
        date: '2024-03-01'
    }
]; 