import { Channel } from '@prisma/client';

export interface ProviderPayload {
  to: string;
  subject?: string;
  body: string;
  channel: Channel;
}

export interface ProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface NotificationProvider {
  send(payload: ProviderPayload): Promise<ProviderResult>;
}
