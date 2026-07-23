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

@Entity('whiteboard_snapshots')
@Unique('UQ_whiteboard_snapshot_sequence', ['whiteboardId', 'sequence'])
@Index('IDX_whiteboard_snapshots_whiteboard_sequence', [
  'whiteboardId',
  'sequence',
])
export class WhiteboardSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  whiteboardId: string;

  @ManyToOne(() => Whiteboard, (whiteboard) => whiteboard.snapshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'whiteboardId' })
  whiteboard: Whiteboard;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
