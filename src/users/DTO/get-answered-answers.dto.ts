import { AnswerDto } from '../../answer/DTO/answer.dto';
import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { PageDto } from '../../common/DTO/page-response.dto';

export interface GetAnsweredAnswersResponseDto extends BaseResponseDto {
  data: {
    answers: AnswerDto[];
    page: PageDto;
  };
}
