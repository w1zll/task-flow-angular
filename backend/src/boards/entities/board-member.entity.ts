import { Board } from './board.entity';
import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BoardRole } from './board-role.enum';

@Entity('board_members')
@Unique(['boardId', 'userId'])
export class BoardMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  boardId: string;

  @ManyToOne(() => Board, (board) => board.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board: Board;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.boardMemberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: BoardRole,
    default: BoardRole.EDITOR,
  })
  role: BoardRole;

  @Column({ type: 'uuid', nullable: true })
  invitedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invitedById' })
  invitedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
