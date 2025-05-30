import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateIssuerPage from '@/app/(auth)/create-issuer/page';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            insert: jest.fn(() => ({
                select: jest.fn(() => ({
                    data: null,
                    error: null
                }))
            }))
        }))
    }
}));

describe('CreateIssuerPage', () => {
    // Test basic rendering
    it('renders the form with initial step', () => {
        render(<CreateIssuerPage />);
        expect(screen.getByText('Create New Issuer')).toBeInTheDocument();
        expect(screen.getByText('Company Information')).toBeInTheDocument();
    });

    // Test form navigation
    it('allows navigation between steps', async () => {
        render(<CreateIssuerPage />);
        
        // Fill required fields in step 1
        await userEvent.type(screen.getByLabelText('Company Name'), 'Test Company');
        await userEvent.click(screen.getByText('Next: Management Details'));
        
        // Check if we're on step 2
        expect(screen.getByText('Chief Executive Officer')).toBeInTheDocument();
    });

    // Test conditional rendering
    it('shows additional directors when selected', async () => {
        render(<CreateIssuerPage />);
        
        // Navigate to Management Details
        await userEvent.click(screen.getByText('Next: Management Details'));
        
        // Select number of additional directors
        const select = screen.getByLabelText('How many additional directors?');
        await userEvent.selectOptions(select, '2');
        
        // Check if additional director fields are shown
        expect(screen.getByText('Additional Director 1')).toBeInTheDocument();
        expect(screen.getByText('Additional Director 2')).toBeInTheDocument();
    });

    // Test form submission
    it('submits form data to Supabase', async () => {
        render(<CreateIssuerPage />);
        
        // Fill out minimum required fields
        await userEvent.type(screen.getByLabelText('Company Name'), 'Test Company');
        await userEvent.type(screen.getByLabelText('Business Email'), 'test@example.com');
        
        // Navigate through all steps
        for (let i = 1; i < 7; i++) {
            await userEvent.click(screen.getByText(/Next:/));
        }
        
        // Submit form
        await userEvent.click(screen.getByText('Submit Application'));
        
        // Check if Supabase was called
        expect(supabase.from).toHaveBeenCalledWith('issuers');
    });
}); 
