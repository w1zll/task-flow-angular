'use client';

import { Avatar } from '@mui/material';

interface Props {
  name?: string | null;
  src?: string | null;
  size?: number;
}

const UserAvatar = ({ name, src, size = 34 }: Props) => {
  const initials =
    name
      ?.split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <Avatar
      src={src || undefined}
      alt={name || ''}
      sx={{
        width: size,
        height: size,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        fontSize: Math.max(9, Math.round(size * 0.38)),
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </Avatar>
  );
};

export default UserAvatar;
