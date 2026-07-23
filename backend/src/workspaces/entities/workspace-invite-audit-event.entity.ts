import { User } from '@/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkspaceInvite } from './workspace-invite.entity';
import { Workspace } from './workspace.entity';

export enum WorkspaceInviteAuditEventType {
  CREATED = 'workspace_invite_created',
  ACCEPTED = 'workspace_invite_accepted',
  REVOKED = 'workspace_invite_revoked',
}

@Entity('workspace_invite_audit_events')
export class WorkspaceInviteAuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'uuid', nullable: true })
  inviteId: string | null;

  @ManyToOne(() => WorkspaceInvite, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inviteId' })
  invite: WorkspaceInvite | null;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser: User | null;

  @Column({
    type: 'enum',
    enum: WorkspaceInviteAuditEventType,
    enumName: 'workspace_invite_audit_events_event_enum',
  })
  event: WorkspaceInviteAuditEventType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
