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
      where: { userId, revokedAt: null },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
  }

  static async revokeKey(userId: string, id: string) {
    // Note: ensure the key belongs to the user
    return prisma.apiKey.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date() },
    });
  }
}
