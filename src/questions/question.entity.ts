import { Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { GroupQuestionRelationship } from "../groups/group.entity";

@Entity()
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => GroupQuestionRelationship, gqr => gqr.question)
  groupQuestionRelationship: GroupQuestionRelationship;
}