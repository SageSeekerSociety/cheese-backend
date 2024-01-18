import { UserDto } from '../../users/DTO/user.dto';

export class GroupDto {
  id: number;
  name: string;
  intro: string;
  owner: UserDto;
  created_at: number; // timestamp
  member_count: number;
  question_count: number;
  answer_count: number;
  is_member: boolean;
  is_owner: boolean;
  is_public: boolean;
}
