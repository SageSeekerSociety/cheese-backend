import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class UserChallengeRepository {
  private readonly redisClient: Redis;

  constructor(private readonly redisService: RedisService) {
    // 获取 Redis 客户端，若不存在则抛出异常
    this.redisClient = this.redisService.getOrThrow();
  }

  // 构造 Redis key，格式：user:{userId}:challenge
  private getKey(userId: number): string {
    return `user:${userId}:challenge`;
  }

  // 设置用户的 challenge，并设置过期时间（单位：秒）
  async setChallenge(
    userId: number,
    challenge: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.getKey(userId);
    await this.redisClient.set(key, challenge, 'EX', ttlSeconds);
  }

  // 获取用户的 challenge
  async getChallenge(userId: number): Promise<string | null> {
    const key = this.getKey(userId);
    return await this.redisClient.get(key);
  }

  // 删除用户的 challenge
  async deleteChallenge(userId: number): Promise<void> {
    const key = this.getKey(userId);
    await this.redisClient.del(key);
  }
}
