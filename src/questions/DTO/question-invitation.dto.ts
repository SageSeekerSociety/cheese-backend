import { UserDto } from '../../users/DTO/user.dto';

export class QuestionInvitationDto {
  id: number;
  question_id: number;
  user: UserDto;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  is_answered: boolean;
}
