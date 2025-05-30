import { render, act } from '@testing-library/react';
import { ApprovalProvider, useApproval } from '../ApprovalContext';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      }),
      insert: () => Promise.resolve({ error: null })
    })
  })
}));

describe('ApprovalContext', () => {
  it('provides approval context to children', () => {
    const TestComponent = () => {
      const approval = useApproval();
      expect(approval).toBeDefined();
      return null;
    };

    render(
      <ApprovalProvider>
        <TestComponent />
      </ApprovalProvider>
    );
  });

  // Add more tests as needed
}); 
