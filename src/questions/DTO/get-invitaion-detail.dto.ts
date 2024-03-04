import { BaseRespondDto } from "../../common/DTO/base-respond.dto";
import { User } from "../../users/users.legacy.entity";
export class QuestionInvitationDto {
  id:number;
  questionId:number;
  user:User;
  createdAt:Date;
  updatedAt:Date;
  isAnwered:boolean;
}
export class QuestionInvitationResponseDto extends BaseRespondDto {
  data:QuestionInvitationDto; 
}