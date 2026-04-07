import twilio from 'twilio';
import { NotificationProvider, ProviderPayload, ProviderResult } from './provider.interface';

export class TwilioProvider implements NotificationProvider {
  private client: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
    const authToken = process.env.TWILIO_AUTH_TOKEN as string;
    this.client = twilio(accountSid, authToken);
  }

  async send(payload: ProviderPayload): Promise<ProviderResult> {
    try {
      const message = await this.client.messages.create({
        body: payload.body,
        from: process.env.TWILIO_FROM_NUMBER as string,
        to: payload.to,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
