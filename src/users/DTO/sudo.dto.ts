import { BaseResponseDto } from '../../common/DTO/base-response.dto';

export class VerifySudoRequestDto {
  method: 'password' | 'srp' | 'passkey' | 'totp';
  credentials: {
    // 传统密码凭据
    password?: string;
    // SRP 凭据
    clientPublicEphemeral?: string;
    clientProof?: string;
    // Passkey 凭据
    passkeyResponse?: any;
    // TOTP 凭据
    code?: string;
  };
}

export class VerifySudoResponseDto extends BaseResponseDto {
  data: {
    accessToken: string;
    // 如果是 SRP 方式，需要返回这些字段用于完成握手
    salt?: string;
    serverPublicEphemeral?: string;
    serverProof?: string;
    // 如果是传统密码验证且触发了 SRP 升级，返回此字段
    srpUpgraded?: boolean;
  };
}
