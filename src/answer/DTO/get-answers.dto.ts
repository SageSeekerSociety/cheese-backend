import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';
import { AnswerDto } from './answer.dto';

export interface GetAnswersResponseDto extends BaseResponseDto {
  data: {
    answers: AnswerDto[];
    page: PageDto;
  };
}
