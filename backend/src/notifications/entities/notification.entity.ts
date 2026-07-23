import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum NotificationType {
  MENTION = 'mention',
  TASK_ASSIGNED = 'task_assigned',
  TEAM_TASK_CHANGED = 'team_task_changed',
  BOARD_MEMBER_ADDED = 'board_member_added',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorId' })
  actor: User | null;

  @Column({
    type: 'enum',
    enum: NotificationType,
    enumName: 'notifications_type_enum',
  })
  type: NotificationType;

  @Column({ type: 'uuid', nullable: true })
  boardId: string | null;

  @Column({ type: 'uuid', nullable: true })
  taskId: string | null;

  @Column({ type: 'uuid', nullable: true })
  commentId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
