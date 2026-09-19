/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  message: string;
  ipAddress: string;
  deviceInfo: string;
  isTwilioSent: boolean;
  twilioStatus: 'NOT_CONFIGURED' | 'PENDING' | 'SENT' | 'FAILED';
  twilioError?: string;
  whatsappRecipient?: string;
  whatsappMessageBody?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  attemptsCount: number;
  remainingAttempts: number;
  lockedOut: boolean;
  lockoutExpiry?: string; 
  securityEvent?: SecurityEvent;
}

export interface JavaOOPFile {
  name: string;
  role: string;
  oopConcept: string;
  code: string;
  description: string;
}
