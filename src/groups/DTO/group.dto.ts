import { BaseResponseDto } from '../../common/DTO/base-response.dto';
import { UserDto } from '../../users/DTO/user.dto';

export class GroupDto {
  id: number;
  name: string;
  intro: string;
  avatarId: number;
  owner: UserDto;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  member_count: number;
  question_count: number;
  answer_count: number;
  is_member: boolean;
  is_owner: boolean;
  is_public: boolean;
}

export class GroupResponseDto extends BaseResponseDto {
  data: {
    group: GroupDto;
  };
}
