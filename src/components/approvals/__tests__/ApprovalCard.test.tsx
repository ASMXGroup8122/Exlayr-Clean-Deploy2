import { render, fireEvent } from '@testing-library/react';
import { ApprovalCard } from '../ApprovalCard';

describe('ApprovalCard', () => {
  const mockProps = {
    id: '1',
    type: 'sponsor' as const,
    name: 'Test Sponsor',
    status: 'pending',
    onApprove: jest.fn(),
    onReject: jest.fn(),
  };

  it('renders correctly', () => {
    const { getByText } = render(<ApprovalCard {...mockProps} />);
    expect(getByText('Test Sponsor')).toBeInTheDocument();
    expect(getByText('Type: sponsor')).toBeInTheDocument();
    expect(getByText('Status: pending')).toBeInTheDocument();
  });

  it('calls onApprove when approve button is clicked', () => {
    const { getByText } = render(<ApprovalCard {...mockProps} />);
    fireEvent.click(getByText('Approve'));
    expect(mockProps.onApprove).toHaveBeenCalled();
  });
}); 
