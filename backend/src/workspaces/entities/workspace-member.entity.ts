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
import { Workspace } from './workspace.entity';
import { WorkspaceRole } from './workspace-role.enum';

@Entity('workspace_members')
@Unique(['workspaceId', 'userId'])
export class WorkspaceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.workspaceMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: WorkspaceRole,
    enumName: 'workspace_members_role_enum',
    default: WorkspaceRole.MEMBER,
  })
  role: WorkspaceRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
