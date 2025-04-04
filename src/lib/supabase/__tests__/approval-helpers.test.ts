import { fetchPendingApprovals, updateApprovalStatus } from '../approval-helpers';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(),
}));

describe('Approval Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPendingApprovals', () => {
    it('fetches pending approvals from all tables', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      (createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase);

      const result = await fetchPendingApprovals();
      expect(result).toHaveProperty('sponsors');
      expect(result).toHaveProperty('issuers');
      expect(result).toHaveProperty('exchanges');
    });
  });
}); 