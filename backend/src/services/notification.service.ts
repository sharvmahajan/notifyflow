import prisma from '../lib/prisma';
import { getProvider } from '../providers';
import { Channel, NotificationStatus, Environment } from '@prisma/client';

export class NotificationService {
  static async send(
    userId: string,
    apiKeyId: string | null,
    channel: Channel,
    to: string,
    subject?: string,
    body?: string,
    templateId?: string,
    variables?: Record<string, string>
  ) {
    let finalSubject = subject;
    let finalBody = body;
    let template = null;

    if (templateId) {
      template = await prisma.template.findFirst({
        where: { id: templateId, userId },
      });
      if (!template) throw new Error('Template not found');

      finalSubject = template.subject ?? finalSubject;
      finalBody = template.body;

      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          if (finalSubject) finalSubject = finalSubject.replace(regex, value);
          if (finalBody) finalBody = finalBody.replace(regex, value);
        }
      }

      await prisma.template.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    if (!finalBody) throw new Error('Body or Template is required');

    if (channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      throw new Error(`Invalid email address format: ${to}`);
    }

    // Unescape literal \n into real newlines
    finalBody = finalBody.replace(/\\n/g, '\n');

    const notification = await prisma.notification.create({
      data: {
        userId,
        apiKeyId,
        channel,
        recipient: to,
        subject: finalSubject,
        body: finalBody,
        status: NotificationStatus.pending,
      },
    });

    const provider = getProvider(channel);
    
    const startTime = Date.now();
    const result = await provider.send({
      to,
      subject: finalSubject,
      body: finalBody,
      channel,
    });
    const latencyMs = Date.now() - startTime;

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: result.success ? NotificationStatus.success : NotificationStatus.failed,
        latencyMs,
        errorMessage: result.error,
        sentAt: result.success ? new Date() : null,
      },
    });

    return updated;
  }

  static async sendBatch(
    userId: string,
    apiKeyId: string | null,
    channel: Channel,
    recipients: string[],
    subject?: string,
    body?: string,
    templateId?: string,
    variables?: Record<string, string>
  ) {
    // Process recursively in batches of 10
    const concurrency = 10;
    const results = [];
    
    for (let i = 0; i < recipients.length; i += concurrency) {
      const chunk = recipients.slice(i, i + concurrency);
      const chunkPromises = chunk.map((to) => 
        this.send(userId, apiKeyId, channel, to, subject, body, templateId, variables)
          .then(res => ({ to, success: res.status === NotificationStatus.success, error: res.errorMessage }))
          .catch(err => ({ to, success: false, error: err.message }))
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  static async record(
    userId: string,
    apiKeyId: string | null,
    channel: Channel,
    recipient: string,
    status: NotificationStatus,
    errorMessage?: string
  ) {
    return prisma.notification.create({
      data: {
        userId,
        apiKeyId,
        channel,
        recipient,
        status,
        errorMessage,
        subject: 'Blocked Attempt',
        body: 'This notification was blocked or paused.',
      },
    });
  }
}
