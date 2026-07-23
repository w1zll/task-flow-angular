import { User } from './entities/user.entity';

export const toPublicUser = (user: User | null | undefined): User => {
  if (!user) return user;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  } as User;
};
