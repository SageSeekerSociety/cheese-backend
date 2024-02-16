import { BaseRespondDto } from '../../common/DTO/base-respond.dto';
enum AgreeType {
  Neither = 0,
  Agreed = 1,
  Disagreed = 2,
}
export class AgreeCommentDto {
  agree_type: AgreeType;
}
export class AgreeCommentResponseDto extends BaseRespondDto {
  data: AgreeCommentDto;
}
