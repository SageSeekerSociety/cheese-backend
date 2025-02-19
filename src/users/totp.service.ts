import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { authenticator } from 'otplib';
import { InvalidTokenError } from '../auth/auth.error';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../common/prisma/prisma.service';

const ENCRYPTION_KEY_SALT = 'cheese-totp-secret-';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

@Injectable()
export class TOTPService {
  private readonly encryptionKey: Buffer;
  private readonly backupCodesCount: number;
  private readonly appName: string;
  private readonly window: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly prismaService: PrismaService,
  ) {
    // 从配置中获取参数
    const config = this.configService.get('totp');
    this.appName = config.appName;
    this.backupCodesCount = config.backupCodesCount;
    this.window = config.window;

    // 使用固定的盐值和配置的密钥生成加密密钥
    const encryptionKey =
      config.encryptionKey || 'your-fallback-key-at-least-32-chars-long';
    this.encryptionKey = Buffer.from(
      createHash('sha256')
        .update(ENCRYPTION_KEY_SALT + encryptionKey)
        .digest(),
    );

    // 配置 authenticator
    authenticator.options = {
      window: this.window,
    };
  }

  private encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // 将 IV、认证标签和加密数据拼接在一起，并进行 Base64 编码
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decryptSecret(encryptedData: string): string {
    const data = Buffer.from(encryptedData, 'base64');

    // 从拼接的数据中提取各个部分
    const iv = data.slice(0, 12);
    const authTag = data.slice(12, 28);
    const encrypted = data.slice(28);

    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  private hashBackupCode(code: string): string {
    return bcrypt.hashSync(code, 10);
  }

  private verifyBackupCode(code: string, hashedCode: string): boolean {
    return bcrypt.compareSync(code, hashedCode);
  }

  async generateTOTPSecret(): Promise<string> {
    return authenticator.generateSecret();
  }

  generateTOTPUri(secret: string, username: string): string {
    return `otpauth://totp/${this.appName}:${username}?secret=${secret}&issuer=${this.appName}`;
  }

  async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < this.backupCodesCount; i++) {
      const code = randomBytes(4).toString('hex');
      codes.push(code);
    }
    return codes;
  }

  async enable2FA(
    userId: number,
    secret: string,
    token: string,
  ): Promise<string[]> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.totpEnabled) {
      throw new Error('2FA is already enabled');
    }

    // 验证用户提供的 token 是否正确
    if (!this.verifyTOTP(secret, token)) {
      throw new Error('Invalid TOTP token');
    }

    // 生成备份码
    const backupCodes = await this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map((code) =>
      this.hashBackupCode(code),
    );

    // 创建备份码
    await Promise.all(
      hashedBackupCodes.map((codeHash) =>
        this.prismaService.userBackupCode.create({
          data: {
            userId,
            codeHash,
            used: false,
          },
        }),
      ),
    );

    // 更新用户的 TOTP 设置
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        totpSecret: this.encryptSecret(secret),
        totpEnabled: true,
      },
    });

    return backupCodes;
  }

  async generateAndSaveBackupCodes(userId: number): Promise<string[]> {
    // 生成新的备份码
    const backupCodes = await this.generateBackupCodes();
    const hashedBackupCodes = backupCodes.map((code) =>
      this.hashBackupCode(code),
    );

    // 删除旧的备份码
    await this.prismaService.userBackupCode.deleteMany({
      where: { userId },
    });

    // 保存新的备份码
    await Promise.all(
      hashedBackupCodes.map((codeHash) =>
        this.prismaService.userBackupCode.create({
          data: {
            userId,
            codeHash,
            used: false,
          },
        }),
      ),
    );

    return backupCodes;
  }

  async disable2FA(userId: number): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.totpEnabled) {
      throw new Error('2FA is not enabled');
    }

    // 删除所有备份码
    await this.prismaService.userBackupCode.deleteMany({
      where: { userId },
    });

    // 禁用 2FA
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        totpSecret: null,
        totpEnabled: false,
      },
    });
  }

  verifyTOTP(secret: string, token: string): boolean {
    return authenticator.verify({ token, secret });
  }

  async verify2FA(
    userId: number,
    token: string,
  ): Promise<{ isValid: boolean; usedBackupCode: boolean }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.totpEnabled || !user.totpSecret) {
      return { isValid: false, usedBackupCode: false };
    }

    // 检查是否是备用代码
    const backupCodes = await this.prismaService.userBackupCode.findMany({
      where: {
        userId,
        used: false,
      },
    });

    // 遍历所有未使用的备用码进行验证
    for (const backupCode of backupCodes) {
      if (this.verifyBackupCode(token, backupCode.codeHash)) {
        // 标记备用代码为已使用
        await this.prismaService.userBackupCode.update({
          where: { id: backupCode.id },
          data: { used: true },
        });
        return { isValid: true, usedBackupCode: true };
      }
    }

    // 验证 TOTP 代码
    const decryptedSecret = this.decryptSecret(user.totpSecret);
    const isValid = authenticator.verify({
      token,
      secret: decryptedSecret,
    });

    return { isValid, usedBackupCode: false };
  }

  async verify2FAAndGenerateToken(
    userId: number,
    token: string,
  ): Promise<string> {
    const isValid = await this.verify2FA(userId, token);
    if (!isValid) {
      throw new InvalidTokenError();
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error('User not found');
    }

    // Generate a new access token with sudo permissions
    return this.authService.sign({
      userId: user.id,
      permissions: [],
      sudoUntil: Date.now() + 15 * 60 * 1000, // 15 minutes
    });
  }
}
