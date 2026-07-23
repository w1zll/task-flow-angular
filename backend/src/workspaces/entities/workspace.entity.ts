import { Board } from '@/boards/entities/board.entity';
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
import { WorkspaceMember } from './workspace-member.entity';
import { WorkspaceInvite } from './workspace-invite.entity';
import { Team } from '@/teams/entities/team.entity';
import { Whiteboard } from '@/whiteboards/entities/whiteboard.entity';

@Entity('workspaces')
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ default: false })
  isPersonal: boolean;

  @Column({ default: false })
  isDemoTemplate: boolean;

  @Column({ default: false })
  isDemoInstance: boolean;

  @Column({ type: 'timestamp', nullable: true })
  demoExpiresAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  demoSourceWorkspaceId: string | null;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, (user) => user.ownedWorkspaces, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => WorkspaceMember, (member) => member.workspace, {
    cascade: true,
  })
  members: WorkspaceMember[];

  @OneToMany(() => Board, (board) => board.workspace)
  boards: Board[];

  @OneToMany(() => WorkspaceInvite, (invite) => invite.workspace)
  invites: WorkspaceInvite[];

  @OneToMany(() => Team, (team) => team.workspace)
  teams: Team[];

  @OneToMany(() => Whiteboard, (whiteboard) => whiteboard.workspace)
  whiteboards: Whiteboard[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
