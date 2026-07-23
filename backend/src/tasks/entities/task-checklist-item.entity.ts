import { Task } from './task.entity';
import { User } from '@/users/entities/user.entity';
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

@Entity('task_checklist_items')
@Index('IDX_task_checklist_items_task_order', ['taskId', 'order'])
export class TaskChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.checklistItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ length: 500 })
  title: string;

  @Column({ default: false })
  isDone: boolean;

  @Column({ default: 0 })
  order: number;

  @Column({ type: 'uuid', nullable: true })
  assigneeId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: User | null;

  @Column({ nullable: true, length: 200 })
  assigneeName?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
