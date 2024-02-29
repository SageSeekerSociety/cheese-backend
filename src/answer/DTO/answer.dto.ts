import { UserDto } from '../../users/DTO/user.dto';

export class AnswerDto {
  id: number;
  question_id: number;
  content: string;
  author: UserDto;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  agree_type: number;
  is_favorite: boolean;
  agree_count: number;
  favorite_count: number;
  view_count: number;
}
