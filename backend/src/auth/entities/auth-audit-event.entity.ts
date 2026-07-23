import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OAuthProvider } from './auth-identity.entity';

export enum AuthAuditEventType {
  OAuthLoginSuccess = 'oauth_login_success',
  OAuthLoginFailure = 'oauth_login_failure',
  IdentityLinked = 'identity_linked',
  IdentityUnlinked = 'identity_unlinked',
}

@Entity('auth_audit_events')
export class AuthAuditEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40 })
  event: AuthAuditEventType;

  @Column({ type: 'varchar', length: 20 })
  provider: OAuthProvider;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sessionId: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  errorCode: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
