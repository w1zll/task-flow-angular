import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Board } from './board.entity';
import { User } from '@/users/entities/user.entity';

@Entity('board_views')
@Index(['boardId', 'ownerId'])
export class BoardView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  title: string;

  @Column()
  boardId: string;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board: Board;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ type: 'jsonb', default: {} })
  filters: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  sort: Record<string, unknown>;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

