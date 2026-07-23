'use client';

import type { Team, WorkspaceMember } from '@/shared/api/api';
import UserAvatar from '@/shared/ui/UserAvatar';
import UserSelectOption from '@/shared/ui/UserSelectOption';
import { DeleteOutlined, PersonAddAltOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface TeamMembersDialogProps {
  team?: Team;
  canManage: boolean;
  availableMembers: WorkspaceMember[];
  selectedUserId: string;
  isAdding: boolean;
  isRemoving: boolean;
  onRequestClose: () => void;
  onCloseAction: () => void;
  onSelectedUserIdChange: (userId: string) => void;
  onAddMember: () => void;
  onRemoveMember: (memberId: string) => void;
}

const TeamMembersDialog = ({
  team,
  canManage,
  availableMembers,
  selectedUserId,
  isAdding,
  isRemoving,
  onRequestClose,
  onCloseAction,
  onSelectedUserIdChange,
  onAddMember,
  onRemoveMember,
}: TeamMembersDialogProps) => {
  const t = useTranslations('WorkspaceTeams');
  const titleId = 'team-members-dialog-title';

  const renderAvailableMemberOption = (member: WorkspaceMember) => (
    <UserSelectOption
      name={member.user.name}
      avatar={member.user.avatar}
      avatarSize={24}
    />
  );

  return (
    <Dialog
      open={Boolean(team)}
      onClose={onRequestClose}
      aria-labelledby={titleId}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id={titleId}>
        {t('membersTitle', { team: team?.name ?? '' })}
      </DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {canManage && availableMembers.length > 0 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <FormControl size="small" fullWidth>
              <InputLabel>{t('addMember')}</InputLabel>
              <Select<string>
                label={t('addMember')}
                value={selectedUserId}
                renderValue={(value) => {
                  const selected = availableMembers.find(
                    (member) => member.userId === value,
                  );
                  return selected ? renderAvailableMemberOption(selected) : '';
                }}
                onChange={(event) =>
                  onSelectedUserIdChange(event.target.value)
                }
              >
                {availableMembers.map((member) => (
                  <MenuItem key={member.id} value={member.userId}>
                    {renderAvailableMemberOption(member)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<PersonAddAltOutlined />}
              disabled={!selectedUserId || isAdding}
              onClick={onAddMember}
              sx={{ flexShrink: 0 }}
            >
              {t('add')}
            </Button>
          </Stack>
        )}
        {canManage && availableMembers.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('noAvailableMembers')}
          </Alert>
        )}

        <Stack divider={<Divider flexItem />}>
          {team?.members.length ? (
            team.members.map((member) => (
              <Stack
                key={member.id}
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', py: 1.25 }}
              >
                <UserAvatar
                  name={member.user.name}
                  src={member.user.avatar}
                  size={34}
                />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}
                  >
                    {member.user.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {member.user.email}
                  </Typography>
                </Box>
                {canManage && (
                  <Tooltip title={t('removeMember')}>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={isRemoving}
                      aria-label={`${t('removeMember')}: ${member.user.name}`}
                      onClick={() => onRemoveMember(member.id)}
                    >
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {t('noMembers')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseAction}>{t('close')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TeamMembersDialog;
