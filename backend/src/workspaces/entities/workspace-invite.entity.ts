import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkspaceRole } from './workspace-role.enum';
import { Workspace } from './workspace.entity';

@Entity('workspace_invites')
export class WorkspaceInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.invites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ length: 64, unique: true })
  tokenHash: string;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({
    type: 'enum',
    enum: WorkspaceRole,
    enumName: 'workspace_members_role_enum',
    default: WorkspaceRole.MEMBER,
  })
  defaultRole: WorkspaceRole;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'integer', nullable: true })
  maxUses: number | null;

  @Column({ type: 'integer', default: 0 })
  usesCount: number;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ nullable: true, length: 255 })
  allowedEmailDomain: string | null;

  @Column({ nullable: true, length: 100 })
  allowedEmail: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
