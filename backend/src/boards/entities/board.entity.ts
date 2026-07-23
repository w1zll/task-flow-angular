import { Column as BoardColumn } from '@/columns/entities/column.entity';
import { User } from '@/users/entities/user.entity';
import { BoardMember } from './board-member.entity';
import { Workspace } from '@/workspaces/entities/workspace.entity';
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

@Entity('boards')
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: '#669266' })
  color: string;

  @Column()
  ownerId: string;

  @ManyToOne(() => User, (user) => user.boards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.boards, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @OneToMany(() => BoardMember, (member) => member.board, { cascade: true })
  members: BoardMember[];

  @OneToMany(() => BoardColumn, (col) => col.board, { cascade: true })
  columns: BoardColumn[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
