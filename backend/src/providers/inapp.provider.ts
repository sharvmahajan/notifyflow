import { NotificationProvider, ProviderPayload, ProviderResult } from './provider.interface';
import { emitToUser } from '../lib/socket';

export class InAppProvider implements NotificationProvider {
  async send(payload: ProviderPayload): Promise<ProviderResult> {
    try {
      emitToUser(payload.to, 'notification', {
        subject: payload.subject,
        body: payload.body,
        createdAt: new Date(),
      });

      return {
        success: true,
        messageId: `inapp_${Math.random().toString(36).substring(2, 10)}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
