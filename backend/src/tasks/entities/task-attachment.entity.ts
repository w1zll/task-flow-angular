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
} from 'typeorm';

@Entity('task_attachments')
@Index('IDX_task_attachments_task_created', ['taskId', 'createdAt'])
export class TaskAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @ManyToOne(() => Task, (task) => task.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @Column({ length: 255 })
  fileName: string;

  @Column({ length: 120 })
  mimeType: string;

  @Column()
  size: number;

  @Column({ length: 1000 })
  url: string;

  @Column({ length: 500 })
  storageKey: string;

  @Column({ length: 32 })
  storageProvider: string;

  @Column({ default: false })
  isImage: boolean;

  @Column({ type: 'uuid', nullable: true })
  uploadedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
