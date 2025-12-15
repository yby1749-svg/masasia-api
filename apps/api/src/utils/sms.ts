// ============================================================================
// Twilio SMS Service
// ============================================================================

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client: twilio.Twilio | null = null;

// Initialize Twilio client
function initializeTwilio() {
  if (client) return;

  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.warn('Twilio credentials not configured. SMS disabled.');
    return;
  }

  try {
    client = twilio(accountSid, authToken);
    console.log('Twilio client initialized');
  } catch (error) {
    console.error('Failed to initialize Twilio:', error);
  }
}

// Initialize on module load
initializeTwilio();

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS to a phone number
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<SMSResult> {
  if (!client) {
    console.log(`[SMS] Twilio not configured. Would send to ${to}: ${body}`);
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    // Format phone number (ensure it starts with +)
    const formattedTo = to.startsWith('+') ? to : `+${to}`;

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to: formattedTo,
    });

    console.log(`[SMS] Sent to ${to}: ${message.sid}`);
    return { success: true, messageId: message.sid };
  } catch (error) {
    const twilioError = error as { message?: string; code?: number };
    console.error(`[SMS] Failed to send to ${to}:`, twilioError.message);
    return { success: false, error: twilioError.message };
  }
}

/**
 * Send OTP SMS
 */
export async function sendOTP(phone: string, otp: string): Promise<SMSResult> {
  const body = `Your MASASIA verification code is: ${otp}. This code expires in 5 minutes.`;
  return sendSMS(phone, body);
}

/**
 * Send booking confirmation SMS to customer
 */
export async function sendBookingConfirmation(
  phone: string,
  data: {
    bookingNumber: string;
    serviceName: string;
    providerName: string;
    scheduledAt: Date;
  }
): Promise<SMSResult> {
  const formattedDate = data.scheduledAt.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const body = `MASASIA Booking Confirmed!\nBooking #${data.bookingNumber}\nService: ${data.serviceName}\nProvider: ${data.providerName}\nScheduled: ${formattedDate}`;
  return sendSMS(phone, body);
}

/**
 * Send booking acceptance SMS to customer
 */
export async function sendBookingAccepted(
  phone: string,
  data: {
    bookingNumber: string;
    providerName: string;
  }
): Promise<SMSResult> {
  const body = `Great news! Your MASASIA booking #${data.bookingNumber} has been accepted by ${data.providerName}. They will arrive at your scheduled time.`;
  return sendSMS(phone, body);
}

/**
 * Send provider en route SMS to customer
 */
export async function sendProviderEnRoute(
  phone: string,
  data: {
    providerName: string;
    eta: number;
  }
): Promise<SMSResult> {
  const body = `${data.providerName} is on the way! Estimated arrival: ${data.eta} minutes. Track their location in the MASASIA app.`;
  return sendSMS(phone, body);
}

/**
 * Send SOS alert SMS to emergency contact
 */
export async function sendSOSAlert(
  phone: string,
  data: {
    userName: string;
    bookingNumber: string;
    locationUrl?: string;
  }
): Promise<SMSResult> {
  let body = `EMERGENCY ALERT: ${data.userName} has triggered an SOS during their MASASIA service (Booking #${data.bookingNumber}).`;
  if (data.locationUrl) {
    body += ` Location: ${data.locationUrl}`;
  }
  body += ` Please contact them immediately or call emergency services if needed.`;
  return sendSMS(phone, body);
}

/**
 * Send booking reminder SMS
 */
export async function sendBookingReminder(
  phone: string,
  data: {
    bookingNumber: string;
    serviceName: string;
    minutesUntil: number;
  }
): Promise<SMSResult> {
  const body = `Reminder: Your ${data.serviceName} booking #${data.bookingNumber} is in ${data.minutesUntil} minutes. Make sure you're ready!`;
  return sendSMS(phone, body);
}

/**
 * Send password reset SMS
 */
export async function sendPasswordReset(phone: string, resetCode: string): Promise<SMSResult> {
  const body = `Your MASASIA password reset code is: ${resetCode}. This code expires in 1 hour. If you didn't request this, please ignore.`;
  return sendSMS(phone, body);
}

/**
 * Send welcome SMS to new user
 */
export async function sendWelcomeSMS(phone: string, firstName: string): Promise<SMSResult> {
  const body = `Welcome to MASASIA, ${firstName}! Your account is ready. Book professional massage services anytime. Download the app to get started.`;
  return sendSMS(phone, body);
}

/**
 * Send provider approval SMS
 */
export async function sendProviderApproved(
  phone: string,
  displayName: string
): Promise<SMSResult> {
  const body = `Congratulations ${displayName}! Your MASASIA provider account has been approved. You can now start accepting bookings. Log in to set up your services and availability.`;
  return sendSMS(phone, body);
}

/**
 * Send payout confirmation SMS to provider
 */
export async function sendPayoutConfirmation(
  phone: string,
  data: {
    amount: number;
    method: string;
    referenceNumber?: string;
  }
): Promise<SMSResult> {
  let body = `MASASIA Payout: PHP ${data.amount.toLocaleString()} has been sent via ${data.method}.`;
  if (data.referenceNumber) {
    body += ` Ref: ${data.referenceNumber}`;
  }
  body += ` It should arrive within 1-3 business days.`;
  return sendSMS(phone, body);
}
