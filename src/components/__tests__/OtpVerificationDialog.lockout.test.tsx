import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// --- Mocks must be declared before importing the component under test ---

const sendOtpMock = vi.fn();
const verifyOtpMock = vi.fn();

vi.mock('@/hooks/useOtpService', () => ({
  useOtpService: () => ({
    sendOtp: sendOtpMock,
    verifyOtp: verifyOtpMock,
    sending: false,
    verifying: false,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en' }),
}));

// OTP is always required in these tests (skip the backend settings lookup).
vi.mock('@/hooks/useOtpRequirements', () => ({
  fetchOtpRequirements: vi.fn().mockResolvedValue({}),
  isOtpRequiredFor: () => true,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const trackOtpLockoutMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/otpAnalytics', () => ({
  trackOtpLockout: (...args: unknown[]) => trackOtpLockoutMock(...args),
}));

import OtpVerificationDialog from '../OtpVerificationDialog';

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  email: 'student@example.com',
  purpose: 'email_verification' as const,
  onVerified: vi.fn(),
};

beforeEach(() => {
  sendOtpMock.mockReset();
  verifyOtpMock.mockReset();
  trackOtpLockoutMock.mockClear();
  // Default: initial send succeeds
  sendOtpMock.mockResolvedValue({ success: true, expiryMinutes: 10, retryAfterSeconds: 30 });
});

const lockoutCases: Array<{ code: string; scope: 'verify' | 'both'; resendLocked: boolean }> = [
  { code: 'OTP_MAX_ATTEMPTS', scope: 'verify', resendLocked: false },
  { code: 'HOURLY_LIMIT_EXCEEDED', scope: 'both', resendLocked: true },
  { code: 'DAILY_LIMIT_EXCEEDED', scope: 'both', resendLocked: true },
];

describe('OtpVerificationDialog — standardized lockout codes', () => {
  for (const { code, scope, resendLocked } of lockoutCases) {
    it(`disables verify and shows alert for ${code}`, async () => {
      verifyOtpMock.mockResolvedValue({
        valid: false,
        error: `Locked: ${code}`,
        errorCode: code,
        retryAfterSeconds: 120,
      });

      render(<OtpVerificationDialog {...baseProps} />);
      // Wait for initial send
      await waitFor(() => expect(sendOtpMock).toHaveBeenCalled());

      // Type a 6-digit code and click verify
      const user = userEvent.setup();
      const verifyBtn = await screen.findByRole('button', { name: /verify code/i });
      // Manually trigger verify path by typing into hidden OTP input
      const inputs = document.querySelectorAll('input');
      // input-otp renders a single hidden input; grab the first
      const hidden = inputs[0] as HTMLInputElement;
      await user.click(hidden);
      await user.type(hidden, '123456');
      await user.click(verifyBtn);

      // Standardized alert appears
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(`Locked: ${code}`);
      expect(alert).toHaveTextContent(code);
      expect(alert).toHaveAttribute('aria-live', 'assertive');

      // Verify button is disabled and labelled "Verification locked"
      const lockedVerify = screen.getByRole('button', { name: /verification locked/i });
      expect(lockedVerify).toBeDisabled();
      expect(lockedVerify).toHaveAttribute(
        'aria-describedby',
        expect.stringContaining('otp-lockout-message'),
      );

      // Resend state
      if (resendLocked) {
        const resendLockedBtn = screen.getByRole('button', { name: /resend locked/i });
        expect(resendLockedBtn).toBeDisabled();
      } else {
        // Verify-only lockout — resend remains available
        expect(screen.queryByRole('button', { name: /resend locked/i })).toBeNull();
      }

      // Analytics fired with the expected scope/code/retry
      expect(trackOtpLockoutMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code,
          scope,
          retryAfterSeconds: 120,
          purpose: 'email_verification',
          email: 'student@example.com',
        }),
      );
    });
  }

  it('clears verify-only lockout after a successful resend (OTP_MAX_ATTEMPTS)', async () => {
    // Initial send with 0 cooldown so the resend button is immediately clickable
    sendOtpMock.mockReset();
    sendOtpMock.mockResolvedValueOnce({ success: true, expiryMinutes: 10, retryAfterSeconds: 0 });
    verifyOtpMock.mockResolvedValue({
      valid: false,
      error: 'Locked: OTP_MAX_ATTEMPTS',
      errorCode: 'OTP_MAX_ATTEMPTS',
      retryAfterSeconds: 60,
    });

    render(<OtpVerificationDialog {...baseProps} />);
    await waitFor(() => expect(sendOtpMock).toHaveBeenCalled());

    const user = userEvent.setup();
    const hidden = document.querySelector('input') as HTMLInputElement;
    await user.click(hidden);
    await user.type(hidden, '123456');
    await user.click(await screen.findByRole('button', { name: /verify code/i }));

    // Lockout in place
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /verification locked/i })).toBeDisabled();

    // Click Resend — server issues a fresh code
    sendOtpMock.mockResolvedValueOnce({
      success: true,
      expiryMinutes: 10,
      retryAfterSeconds: 30,
    });
    const resendBtn = screen.getByRole('button', { name: /resend code/i });
    await user.click(resendBtn);

    // Lockout cleared, verify button restored
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
    });
  });

  it('auto-unlocks when retry_after_seconds counts down to zero', async () => {
    verifyOtpMock.mockResolvedValue({
      valid: false,
      error: 'Locked: OTP_MAX_ATTEMPTS',
      errorCode: 'OTP_MAX_ATTEMPTS',
      retryAfterSeconds: 2,
    });

    render(<OtpVerificationDialog {...baseProps} />);
    await waitFor(() => expect(sendOtpMock).toHaveBeenCalled());

    const user = userEvent.setup();
    const hidden = document.querySelector('input') as HTMLInputElement;
    await user.click(hidden);
    await user.type(hidden, '123456');
    await user.click(await screen.findByRole('button', { name: /verify code/i }));

    await screen.findByRole('alert');

    // Real timers: wait ~3s for the lockout countdown to drain to 0
    await waitFor(
      () => {
        expect(screen.queryByRole('alert')).toBeNull();
      },
      { timeout: 4000, interval: 200 },
    );
  }, 10000);
});
