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

export enum OAuthProvider {
  Google = 'google',
  GitHub = 'github',
}

@Entity('auth_identities')
@Index('UQ_auth_identities_provider_subject', ['provider', 'providerSubject'], {
  unique: true,
})
@Index('UQ_auth_identities_user_provider', ['userId', 'provider'], {
  unique: true,
})
export class AuthIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  provider: OAuthProvider;

  @Column({ length: 255 })
  providerSubject: string;

  @Column({ type: 'varchar', length: 320, nullable: true })
  providerEmail: string | null;

  @Column({ default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName: string | null;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.authIdentities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
