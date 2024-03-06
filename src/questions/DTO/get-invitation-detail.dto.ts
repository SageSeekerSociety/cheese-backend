import { BaseRespondDto } from "../../common/DTO/base-respond.dto";
import { User } from "../../users/users.legacy.entity";
export class QuestionInvitationDetailDto {
  id:number;
  questionId:number;
  user:User;
  createdAt:Date;
  updatedAt:Date;
  isAnswered:boolean;
}
export class QuestionInvitationDetailResponseDto extends BaseRespondDto {
  data:QuestionInvitationDetailDto; 
}