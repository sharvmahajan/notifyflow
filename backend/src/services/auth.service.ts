import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { User, RefreshToken } from '@prisma/client';

export class AuthService {
  static async signup(data: any): Promise<{ user: Partial<User>, accessToken: string, refreshToken: string }> {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('Email already in use');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
    });

    return this.generateTokens(user);
  }

  static async login(data: any): Promise<{ user: Partial<User>, accessToken: string, refreshToken: string }> {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    return this.generateTokens(user);
  }

  static async refresh(token: string): Promise<{ user: Partial<User>, accessToken: string, refreshToken: string }> {
    try {
      const decoded = verifyRefreshToken(token) as any;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const dbToken = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      if (!dbToken) throw new Error('Invalid refresh token');

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) throw new Error('User not found');

      // Invalidate old token
      await prisma.refreshToken.delete({ where: { tokenHash } });

      return this.generateTokens(user);
    } catch (err) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static async logout(token: string): Promise<void> {
    if (!token) return;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.refreshToken.deleteMany({ where: { tokenHash } }).catch(() => {});
  }

  private static async generateTokens(user: User): Promise<{ user: Partial<User>, accessToken: string, refreshToken: string }> {
    const payload = { id: user.id, email: user.email, plan: user.plan };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  }
}
