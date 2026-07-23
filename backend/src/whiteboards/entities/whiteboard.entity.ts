import { Board } from '@/boards/entities/board.entity';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WhiteboardOperation } from './whiteboard-operation.entity';
import { WhiteboardSnapshot } from './whiteboard-snapshot.entity';

@Entity('whiteboards')
export class Whiteboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: '#3b82f6' })
  color: string;

  @Column({ length: 40, default: 'draw' })
  icon: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'uuid', nullable: true })
  boardId: string | null;

  @ManyToOne(() => Board, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'boardId' })
  board: Board | null;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @Column({ type: 'integer', default: 0 })
  lastSequence: number;

  @OneToMany(() => WhiteboardOperation, (operation) => operation.whiteboard)
  operations: WhiteboardOperation[];

  @OneToMany(() => WhiteboardSnapshot, (snapshot) => snapshot.whiteboard)
  snapshots: WhiteboardSnapshot[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
