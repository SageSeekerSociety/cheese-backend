import { UserDto } from '../../users/DTO/user.dto';

export class QuestionInvitationDto {
  id: number;
  questionId: number;
  user: UserDto;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  isAnswered: boolean;
}
