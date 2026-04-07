import { NotificationProvider, ProviderPayload, ProviderResult } from './provider.interface';

export class ConsoleProvider implements NotificationProvider {
  async send(payload: ProviderPayload): Promise<ProviderResult> {
    console.log('--- CONSOLE PROVIDER LOG ---');
    console.log(`Channel: ${payload.channel}`);
    console.log(`To:      ${payload.to}`);
    if (payload.subject) console.log(`Subject: ${payload.subject}`);
    console.log(`Body:\n${payload.body}`);
    console.log('----------------------------');

    return {
      success: true,
      messageId: `dev_${Math.random().toString(36).substring(2, 10)}`,
    };
  }
}
