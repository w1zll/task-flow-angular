'use client';

import { Box, Typography } from '@mui/material';
import UserAvatar from './UserAvatar';

interface Props {
  name: string;
  avatar?: string | null;
  secondary?: string | null;
  avatarSize?: number;
}

const UserSelectOption = ({
  name,
  avatar,
  secondary,
  avatarSize = 24,
}: Props) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minWidth: 0,
    }}
  >
    <UserAvatar name={name} src={avatar} size={avatarSize} />
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap>
        {name}
      </Typography>
      {secondary && (
        <Typography variant="caption" color="text.secondary" noWrap>
          {secondary}
        </Typography>
      )}
    </Box>
  </Box>
);

export default UserSelectOption;
