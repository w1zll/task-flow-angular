import { Task } from '@/tasks/entities/task.entity';
import { User } from '@/users/entities/user.entity';
import { Workspace } from '@/workspaces/entities/workspace.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { TeamMember } from './team-member.entity';

@Entity('teams')
@Unique(['workspaceId', 'name'])
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 7, default: '#669266' })
  color: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.teams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User | null;

  @OneToMany(() => TeamMember, (member) => member.team, { cascade: true })
  members: TeamMember[];

  @OneToMany(() => Task, (task) => task.team)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
