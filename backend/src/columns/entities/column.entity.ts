import { Board } from '@/boards/entities/board.entity';
import { Task } from '@/tasks/entities/task.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column as OrmColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('columns')
export class Column {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OrmColumn({ length: 200 })
  title: string;

  @OrmColumn({ default: 0 })
  order: number;

  @OrmColumn()
  boardId: string;

  @ManyToOne(() => Board, (board) => board.columns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board: Board;

  @OneToMany(() => Task, (task) => task.column, { cascade: true })
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
