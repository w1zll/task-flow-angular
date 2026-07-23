import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { RefreshToken } from '@/auth/entities/refresh-token.entity';
import { Board } from '@/boards/entities/board.entity';
import { BoardMember } from '@/boards/entities/board-member.entity';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import { WorkspaceMember } from '@/workspaces/entities/workspace-member.entity';
import { AuthIdentity } from '@/auth/entities/auth-identity.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  @Exclude()
  password: string | null;

  @Column({ nullable: true, length: 500 })
  avatar: string;

  @Column({ nullable: true, length: 30 })
  avatarProvider: string;

  @Column({ nullable: true, length: 500 })
  avatarStorageKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Board, (board) => board.owner)
  boards: Board[];

  @OneToMany(() => BoardMember, (member) => member.user)
  boardMemberships: BoardMember[];

  @OneToMany(() => Workspace, (workspace) => workspace.owner)
  ownedWorkspaces: Workspace[];

  @OneToMany(() => WorkspaceMember, (member) => member.user)
  workspaceMemberships: WorkspaceMember[];

  @Column({ type: 'uuid', nullable: true })
  activeWorkspaceId: string | null;

  @ManyToOne(() => Workspace, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'activeWorkspaceId' })
  activeWorkspace: Workspace | null;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => AuthIdentity, (identity) => identity.user)
  authIdentities: AuthIdentity[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }
  async comparePassword(plain: string): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(plain, this.password);
  }
}
