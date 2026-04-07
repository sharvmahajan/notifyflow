import { Channel } from '@prisma/client';
import { NotificationProvider } from './provider.interface';
import { SendGridProvider } from './sendgrid.provider';
import { TwilioProvider } from './twilio.provider';
import { ConsoleProvider } from './console.provider';
import { InAppProvider } from './inapp.provider';

export function getProvider(channel: Channel): NotificationProvider {
  switch (channel) {
    case Channel.email:
      if (process.env.SENDGRID_API_KEY) {
        return new SendGridProvider();
      }
      return new ConsoleProvider();

    case Channel.sms:
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        return new TwilioProvider();
      }
      return new ConsoleProvider();

    case Channel.inapp:
      return new InAppProvider();

    default:
      return new ConsoleProvider();
  }
}
