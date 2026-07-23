import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TaskComment } from './task-comment.entity';

@Entity('mentions')
@Unique(['commentId', 'mentionedUserId'])
export class Mention {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  commentId: string;

  @ManyToOne(() => TaskComment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'commentId' })
  comment: TaskComment;

  @Column({ type: 'uuid' })
  taskId: string;

  @Column({ type: 'uuid' })
  boardId: string;

  @Column({ type: 'uuid' })
  mentionedUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mentionedUserId' })
  mentionedUser: User;

  @CreateDateColumn()
  createdAt: Date;
}
