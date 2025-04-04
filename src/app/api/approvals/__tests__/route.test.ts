import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { GET } from '../route';
import { NextResponse } from 'next/server';

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(),
}));

describe('Approvals API', () => {
  it('fetches pending approvals', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);

    const response = await GET();
    expect(response).toBeInstanceOf(NextResponse);
  });
}); 