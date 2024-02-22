import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
export class AttitudeCommentDto {
  attitudeType: 'Agreed' | 'Disagreed' | 'Indifferent';
}

export class AttitudeCommentResponseDto extends BaseRespondDto {
  data: { attitudeType: 'Agreed' | 'Disagreed' | 'Indifferent' };
}
