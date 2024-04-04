import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { AnswerDto } from './answer.dto';

export class GetAnswersResponseDto extends BaseResponseDto {
  data: {
    answers: AnswerDto[];
    page: PageDto;
  };
}
