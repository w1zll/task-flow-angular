import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Whiteboard } from './whiteboard.entity';
import { WhiteboardOperationType } from './whiteboard-operation-type.enum';

@Entity('whiteboard_operations')
@Unique('UQ_whiteboard_operation_sequence', ['whiteboardId', 'sequence'])
@Unique('UQ_whiteboard_operation_idempotency', [
  'whiteboardId',
  'userId',
  'idempotencyKey',
])
@Index('IDX_whiteboard_operations_whiteboard_sequence', [
  'whiteboardId',
  'sequence',
])
export class WhiteboardOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  whiteboardId: string;

  @ManyToOne(() => Whiteboard, (whiteboard) => whiteboard.operations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'whiteboardId' })
  whiteboard: Whiteboard;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 128 })
  idempotencyKey: string;

  @Column({ type: 'enum', enum: WhiteboardOperationType })
  type: WhiteboardOperationType;

  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;
}
