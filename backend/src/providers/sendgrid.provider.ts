import sgMail from '@sendgrid/mail';
import { NotificationProvider, ProviderPayload, ProviderResult } from './provider.interface';

export class SendGridProvider implements NotificationProvider {
  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) sgMail.setApiKey(apiKey);
  }

  async send(payload: ProviderPayload): Promise<ProviderResult> {
    try {
      const msg = {
        to: payload.to,
        from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@notifyflow.dev',
        subject: payload.subject || 'Notification',
        text: payload.body,
        html: payload.body.replace(/\n/g, '<br>'),
      };

      console.log(`[SendGridProvider] Sending email from: ${msg.from} to: ${msg.to}`);
      
      const [response] = await sgMail.send(msg);
      console.log(`[SendGridProvider] SendGrid response status: ${response.statusCode}`);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'],
      };
    } catch (error: any) {
      console.error(`[SendGridProvider] SendGrid error: ${error.message}`);
      if (error.response) {
        console.error(`[SendGridProvider] SendGrid error body:`, JSON.stringify(error.response.body, null, 2));
      }
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
