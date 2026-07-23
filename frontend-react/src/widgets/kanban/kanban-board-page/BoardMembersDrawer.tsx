'use client';

import type { BoardMember, Team, WorkspaceMember } from '@/shared/api/api';
import { Close } from '@mui/icons-material';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import BoardMembersList from './BoardMembersList';
import BoardShareMemberForm from './BoardShareMemberForm';

interface BoardMembersDrawerProps {
  open: boolean;
  canManageBoardMembers: boolean;
  currentUserId?: string;
  boardMembers?: BoardMember[];
  isBoardMembersLoading: boolean;
  workspaceTeams?: Team[];
  availableWorkspaceMembers: WorkspaceMember[];
  shareUserId: string;
  shareRole: 'editor' | 'viewer';
  isShareMembersLoading: boolean;
  isShareMembersError: boolean;
  isSharePending: boolean;
  isShareError: boolean;
  isUpdateMemberRolePending: boolean;
  isUpdateMemberRoleError: boolean;
  isRevokeMemberPending: boolean;
  isRevokeMemberError: boolean;
  onClose: () => void;
  onShareUserIdChange: (userId: string) => void;
  onShareRoleChange: (role: 'editor' | 'viewer') => void;
  onShareBoard: () => void;
  onUpdateMemberRole: (
    memberId: string,
    role: 'editor' | 'viewer',
  ) => void;
  onRevokeMember: (memberId: string) => void;
}

const BoardMembersDrawer = ({
  open,
  canManageBoardMembers,
  currentUserId,
  boardMembers,
  isBoardMembersLoading,
  workspaceTeams,
  availableWorkspaceMembers,
  shareUserId,
  shareRole,
  isShareMembersLoading,
  isShareMembersError,
  isSharePending,
  isShareError,
  isUpdateMemberRolePending,
  isUpdateMemberRoleError,
  isRevokeMemberPending,
  isRevokeMemberError,
  onClose,
  onShareUserIdChange,
  onShareRoleChange,
  onShareBoard,
  onUpdateMemberRole,
  onRevokeMember,
}: BoardMembersDrawerProps) => {
  const t = useTranslations('BoardPage');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    defaultMatches: false,
  });
  const titleId = 'board-members-drawer-title';
  const descriptionId = 'board-members-drawer-description';

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': titleId,
          'aria-describedby': descriptionId,
          sx: {
            width: isMobile ? '100%' : 460,
            height: '100%',
            bgcolor: 'background.paper',
            borderLeft: isMobile ? 'none' : '1px solid',
            borderTop: isMobile ? '1px solid' : 'none',
            borderColor: 'divider',
            overflowY: 'auto',
          },
        },
      }}
    >
      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography id={titleId} variant="h6" sx={{ fontWeight: 700 }}>
              {t('members')}
            </Typography>
            <Typography
              id={descriptionId}
              variant="body2"
              color="text.secondary"
            >
              {t('membersDescription')}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            aria-label={t('closePanel')}
            sx={{ width: { xs: 44, sm: 32 }, height: { xs: 44, sm: 32 } }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>

        {canManageBoardMembers && (
          <BoardShareMemberForm
            availableWorkspaceMembers={availableWorkspaceMembers}
            shareUserId={shareUserId}
            shareRole={shareRole}
            isShareMembersLoading={isShareMembersLoading}
            isShareMembersError={isShareMembersError}
            isSharePending={isSharePending}
            isShareError={isShareError}
            onShareUserIdChange={onShareUserIdChange}
            onShareRoleChange={onShareRoleChange}
            onShareBoard={onShareBoard}
          />
        )}

        <Divider />

        <BoardMembersList
          boardMembers={boardMembers}
          isLoading={isBoardMembersLoading}
          workspaceTeams={workspaceTeams}
          currentUserId={currentUserId}
          canManageBoardMembers={canManageBoardMembers}
          isUpdateMemberRolePending={isUpdateMemberRolePending}
          isUpdateMemberRoleError={isUpdateMemberRoleError}
          isRevokeMemberPending={isRevokeMemberPending}
          isRevokeMemberError={isRevokeMemberError}
          onUpdateMemberRole={onUpdateMemberRole}
          onRevokeMember={onRevokeMember}
        />
      </Box>
    </Drawer>
  );
};

export default BoardMembersDrawer;
