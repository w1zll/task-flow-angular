import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OAuthProvider } from './auth-identity.entity';

export enum OAuthIntent {
  Login = 'login',
  Link = 'link',
}

@Entity('oauth_attempts')
export class OAuthAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  provider: OAuthProvider;

  @Column({ type: 'varchar', length: 10 })
  intent: OAuthIntent;

  @Index('IDX_oauth_attempts_stateHash', { unique: true })
  @Column({ length: 64 })
  stateHash: string;

  @Column({ length: 64 })
  browserBindingHash: string;

  @Column({ type: 'text' })
  protectedPayload: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nonceHash: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sessionId: string | null;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
