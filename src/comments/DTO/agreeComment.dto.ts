import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
export class AttitudeCommentDto {
  attitudeType: '1' | '2' | '3';
}

export class AttitudeCommentResponseDto extends BaseRespondDto {
  data: { attitudeType: '1' | '2' | '3' };
}
