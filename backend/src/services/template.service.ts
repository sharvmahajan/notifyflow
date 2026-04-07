import prisma from '../lib/prisma';
import { Channel } from '@prisma/client';

export class TemplateService {
  static async listTemplates(userId: string) {
    return prisma.template.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createTemplate(userId: string, data: { name: string, channel: Channel, subject?: string, body: string, variables?: string[] }) {
    return prisma.template.create({
      data: {
        userId,
        name: data.name,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        variables: data.variables || [],
      },
    });
  }

  static async updateTemplate(userId: string, id: string, data: { name?: string, channel?: Channel, subject?: string, body?: string, variables?: string[] }) {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template || template.userId !== userId) throw new Error('Template not found');

    return prisma.template.update({
      where: { id },
      data,
    });
  }

  static async deleteTemplate(userId: string, id: string) {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template || template.userId !== userId) throw new Error('Template not found');

    return prisma.template.delete({ where: { id } });
  }
}
