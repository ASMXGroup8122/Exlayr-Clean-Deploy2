import { render, screen } from '@testing-library/react';
import OrganizationDetailsPage from '../page';
import { ApprovalProvider } from '@/contexts/ApprovalContext';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('OrganizationDetailsPage', () => {
  it('renders loading state', () => {
    render(
      <ApprovalProvider>
        <OrganizationDetailsPage
          params={{ type: 'sponsor', id: '123' }}
        />
      </ApprovalProvider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
}); 