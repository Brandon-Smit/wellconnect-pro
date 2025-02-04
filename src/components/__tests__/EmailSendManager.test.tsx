import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailSendManager from '../EmailSendManager';
import { sendEmailService } from '../../lib/services/email-service';

// Mock the email service
jest.mock('../../lib/services/email-service', () => ({
  sendEmailService: jest.fn()
}));

describe('EmailSendManager Component', () => {
  const mockSendEmailService = sendEmailService as jest.MockedFunction<typeof sendEmailService>;

  beforeEach(() => {
    mockSendEmailService.mockClear();
  });

  it('renders email send form', () => {
    render(<EmailSendManager />);
    
    expect(screen.getByLabelText(/recipient email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email body/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send email/i })).toBeInTheDocument();
  });

  it('sends email successfully', async () => {
    mockSendEmailService.mockResolvedValue({ success: true, message: 'Email sent successfully' });

    render(<EmailSendManager />);
    
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/email subject/i), { target: { value: 'Test Subject' } });
    fireEvent.change(screen.getByLabelText(/email body/i), { target: { value: 'Test Email Body' } });
    
    fireEvent.click(screen.getByRole('button', { name: /send email/i }));

    await waitFor(() => {
      expect(mockSendEmailService).toHaveBeenCalledWith({
        recipientEmail: 'test@example.com',
        subject: 'Test Subject',
        body: 'Test Email Body'
      });
    });
  });

  it('handles email send error', async () => {
    mockSendEmailService.mockRejectedValue(new Error('Send failed'));

    render(<EmailSendManager />);
    
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/email subject/i), { target: { value: 'Test Subject' } });
    fireEvent.change(screen.getByLabelText(/email body/i), { target: { value: 'Test Email Body' } });
    
    fireEvent.click(screen.getByRole('button', { name: /send email/i }));

    await waitFor(() => {
      expect(screen.getByText(/error sending email/i)).toBeInTheDocument();
    });
  });
});
