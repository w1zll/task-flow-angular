import { User } from '@/users/entities/user.entity';
import { Board } from './board.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum BoardActivityEventType {
  BOARD_CREATED = 'board_created',
  BOARD_UPDATED = 'board_updated',
  BOARD_MEMBER_INVITED = 'board_member_invited',
  BOARD_MEMBER_ROLE_CHANGED = 'board_member_role_changed',
  BOARD_MEMBER_REMOVED = 'board_member_removed',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_MOVED = 'task_moved',
  TASK_REORDERED = 'task_reordered',
  TASK_DELETED = 'task_deleted',
  COLUMN_CREATED = 'column_created',
  COLUMN_UPDATED = 'column_updated',
  COLUMN_REORDERED = 'column_reordered',
  COLUMN_DELETED = 'column_deleted',
}

export enum BoardActivityEntityType {
  BOARD = 'board',
  BOARD_MEMBER = 'board_member',
  TASK = 'task',
  COLUMN = 'column',
}

@Entity('board_activities')
export class BoardActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  boardId: string;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board: Board;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser: User | null;

  @Column({
    type: 'enum',
    enum: BoardActivityEventType,
    enumName: 'board_activity_event_enum',
  })
  event: BoardActivityEventType;

  @Column({ type: 'varchar', length: 32 })
  entityType: BoardActivityEntityType;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
