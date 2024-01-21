import { Injectable } from '@nestjs/common';

@Injectable()
export class QuestionsService {
  getHello(): string {
    return 'Hello World!';
  }
}
