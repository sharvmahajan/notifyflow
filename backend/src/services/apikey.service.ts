import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { Environment } from '@prisma/client';

export class ApiKeyService {
  static async createKey(userId: string, name: string, environment: Environment, permissions: any) {
    const rawSecret = crypto.randomBytes(8).toString('hex');
    const envPrefix = environment === Environment.live ? 'nf_live_' : 'nf_test_';
    const plainTextKey = `${envPrefix}${rawSecret}`;
    
    // Hash the full key
    const keyHash = await bcrypt.hash(plainTextKey, 12);
    
    // The prefix is the first 12 characters (e.g. nf_live_ab12 / nf_test_cd34)
    const prefix = plainTextKey.substring(0, 12);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        prefix,
        environment,
        permissions,
      },
    });

    // Return the full plaintext key ONLY once
    return {
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        environment: apiKey.environment,
        createdAt: apiKey.createdAt,
      },
      plainTextKey,
    };
  }

  static async listKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId, status: { not: 'DELETED' } },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async pauseKey(userId: string, id: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new Error('API key not found');
    if (key.status === 'PAUSED') throw new Error('API is already paused');
    if (key.status === 'DELETED') throw new Error('Cannot pause a deleted API');

    return prisma.apiKey.update({
      where: { id },
      data: { status: 'PAUSED', updatedAt: new Date() },
    });
  }

  static async resumeKey(userId: string, id: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new Error('API key not found');
    if (key.status === 'ACTIVE') throw new Error('API is already active');
    if (key.status === 'DELETED') throw new Error('Cannot resume a deleted API');

    return prisma.apiKey.update({
      where: { id },
      data: { status: 'ACTIVE', updatedAt: new Date() },
    });
  }

  static async deleteKey(userId: string, id: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new Error('API key not found');
    if (key.status === 'DELETED') throw new Error('API is already deleted');

    return prisma.apiKey.update({
      where: { id },
      data: { 
        status: 'DELETED', 
        updatedAt: new Date(),
        // Invalidate key by prepending DELETED_ to hash so it never matches
        keyHash: `DELETED_${key.keyHash}`
      },
    });
  }

  static async revokeKey(userId: string, id: string) {
    // Legacy mapping to delete for simplicity or keep as is.
    // Prompt says pause/resume/delete. Revoke seems like old name for delete.
    return this.deleteKey(userId, id);
  }
}
