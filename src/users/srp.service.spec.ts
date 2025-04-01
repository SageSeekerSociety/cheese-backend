/*
 *  Description: This file provides unit tests for SRP service.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  Client as SrpClient,
  Server as SrpServer,
} from '@ruc-cheese/node-srp-rs';
import { AppModule } from '../app.module';
import { SrpService } from './srp.service';

// Mock SRP client and server classes
jest.mock('@ruc-cheese/node-srp-rs', () => {
  const mockClient = {
    generateSalt: jest.fn(() => 'test-salt'),
    derivePrivateKey: jest.fn(() => 'test-private-key'),
    deriveVerifier: jest.fn(() => 'test-verifier'),
  };

  const mockServer = {
    generateEphemeral: jest.fn(() => ({
      secret: 'server-secret',
      public: 'server-public',
    })),
    deriveSession: jest.fn(() => ({
      key: 'shared-key',
      proof: 'server-proof',
    })),
  };

  return {
    Client: jest.fn(() => mockClient),
    Server: jest.fn(() => mockServer),
  };
});

describe('SRP Service', () => {
  let app: TestingModule;
  let srpService: SrpService;
  let mockClient: jest.Mocked<SrpClient>;
  let mockServer: jest.Mocked<SrpServer>;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    srpService = app.get<SrpService>(SrpService);

    // Get the mocked instances
    mockClient = new SrpClient() as jest.Mocked<SrpClient>;
    mockServer = new SrpServer() as jest.Mocked<SrpServer>;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSrpCredentials', () => {
    it('should generate salt and verifier', async () => {
      const username = 'testuser';
      const password = 'testpass';

      const result = await srpService.generateSrpCredentials(
        username,
        password,
      );

      expect(mockClient.generateSalt).toHaveBeenCalled();
      expect(mockClient.derivePrivateKey).toHaveBeenCalledWith(
        'test-salt',
        username,
        password,
      );
      expect(mockClient.deriveVerifier).toHaveBeenCalledWith(
        'test-private-key',
      );
      expect(result).toEqual({
        salt: 'test-salt',
        verifier: 'test-verifier',
      });
    });
  });

  describe('createServerSession', () => {
    it('should create server session with ephemeral keys', async () => {
      const verifier = 'test-verifier';

      const result = await srpService.createServerSession(verifier);

      expect(mockServer.generateEphemeral).toHaveBeenCalledWith(verifier);
      expect(result).toEqual({
        serverEphemeral: {
          secret: 'server-secret',
          public: 'server-public',
        },
      });
    });
  });

  describe('verifyClient', () => {
    it('should verify client proof and return server proof', async () => {
      const serverSecretEphemeral = 'server-secret';
      const clientPublicEphemeral = 'client-public';
      const salt = 'test-salt';
      const username = 'testuser';
      const verifier = 'test-verifier';
      const clientProof = 'client-proof';

      const result = await srpService.verifyClient(
        serverSecretEphemeral,
        clientPublicEphemeral,
        salt,
        username,
        verifier,
        clientProof,
      );

      expect(mockServer.deriveSession).toHaveBeenCalledWith(
        serverSecretEphemeral,
        clientPublicEphemeral,
        salt,
        username,
        verifier,
        clientProof,
      );
      expect(result).toEqual({
        success: true,
        serverProof: 'server-proof',
      });
    });

    it('should return failure when verification fails', async () => {
      mockServer.deriveSession.mockImplementationOnce(() => {
        throw new Error('Verification failed');
      });

      const result = await srpService.verifyClient(
        'server-secret',
        'client-public',
        'salt',
        'username',
        'verifier',
        'invalid-proof',
      );

      expect(result).toEqual({
        success: false,
        serverProof: '',
      });
    });
  });

  describe('isUserSrpUpgraded', () => {
    it('should return true for upgraded user', async () => {
      jest
        .spyOn(srpService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          srpUpgraded: true,
        } as any);

      const result = await srpService.isUserSrpUpgraded(1);
      expect(result).toBe(true);
    });

    it('should return false for non-upgraded user', async () => {
      jest
        .spyOn(srpService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce({
          srpUpgraded: false,
        } as any);

      const result = await srpService.isUserSrpUpgraded(1);
      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      jest
        .spyOn(srpService['prismaService'].user, 'findUnique')
        .mockResolvedValueOnce(null);

      const result = await srpService.isUserSrpUpgraded(1);
      expect(result).toBe(false);
    });
  });

  describe('upgradeUserToSrp', () => {
    it('should upgrade user to SRP', async () => {
      const updateSpy = jest
        .spyOn(srpService['prismaService'].user, 'update')
        .mockResolvedValueOnce({} as any);

      await srpService.upgradeUserToSrp(1, 'testuser', 'testpass');

      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          srpSalt: 'test-salt',
          srpVerifier: 'test-verifier',
          srpUpgraded: true,
        },
      });
    });

    it('should handle upgrade failure', async () => {
      jest
        .spyOn(srpService['prismaService'].user, 'update')
        .mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        srpService.upgradeUserToSrp(1, 'testuser', 'testpass'),
      ).rejects.toThrow('Update failed');
    });
  });
});
