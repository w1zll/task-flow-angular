'use client';

import { useStableBodyScrollLock } from '@/shared/lib/useStableBodyScrollLock';
import {
  useCreateWorkspaceInvite,
  useRevokeWorkspaceInvite,
  useWorkspaceInvites,
} from '@/shared/queries/workspaces.queries';
import { AddLink } from '@mui/icons-material';
import {
  Box,
  Button,
  Divider,
  Paper,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import CreateInviteDialog from './workspace-invites/CreateInviteDialog';
import type { InviteForm } from './workspace-invites/types';
import WorkspaceInvitesList from './workspace-invites/WorkspaceInvitesList';

interface Props {
  workspaceId: string;
  currentUserRole: 'owner' | 'admin';
  canManage?: boolean;
}

const initialForm: InviteForm = {
  defaultRole: 'member',
  expiresInDays: '7',
  maxUses: '',
  allowedEmail: '',
  allowedEmailDomain: '',
};

const WorkspaceInvitesSection = ({
  workspaceId,
  currentUserRole,
  canManage = true,
}: Props) => {
  const t = useTranslations('WorkspaceInvites');
  const { enqueueSnackbar } = useSnackbar();
  const invites = useWorkspaceInvites(workspaceId);
  const createInvite = useCreateWorkspaceInvite(workspaceId);
  const revokeInvite = useRevokeWorkspaceInvite(workspaceId);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [createdLink, setCreatedLink] = useState('');

  useStableBodyScrollLock(isCreateOpen);

  const updateForm = <K extends keyof InviteForm,>(
    key: K,
    value: InviteForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const handleCreate = () => {
    if (!canManage) return;
    createInvite.mutate(
      {
        defaultRole: form.defaultRole,
        expiresInDays: Number(form.expiresInDays),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        allowedEmail: form.allowedEmail.trim() || null,
        allowedEmailDomain: form.allowedEmailDomain.trim() || null,
      },
      {
        onSuccess: (invite) => {
          const link = `${window.location.origin}/invite/${invite.token}`;
          setCreatedLink(link);
          setForm(initialForm);
        },
        onError: () =>
          enqueueSnackbar(t('createError'), { variant: 'error' }),
      },
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(createdLink);
      enqueueSnackbar(t('copied'), { variant: 'success' });
    } catch {
      enqueueSnackbar(t('copyError'), { variant: 'error' });
    }
  };

  const closeDialog = () => {
    if (createInvite.isPending) return;
    setCreateOpen(false);
    setCreatedLink('');
    setForm(initialForm);
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{ minWidth: 0, borderRadius: '6px', mt: 3, overflow: 'hidden' }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {t('title')}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ overflowWrap: 'anywhere' }}
            >
              {t('description')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddLink />}
            onClick={() => setCreateOpen(true)}
            disabled={!canManage}
          >
            {t('create')}
          </Button>
        </Box>
        <Divider />

        <WorkspaceInvitesList
          invites={invites.data}
          isLoading={invites.isLoading}
          isError={invites.isError}
          isRevoking={revokeInvite.isPending}
          canRevoke={canManage}
          onRevoke={(inviteId) => {
            if (!canManage) return;
            revokeInvite.mutate(inviteId, {
              onError: () =>
                enqueueSnackbar(t('revokeError'), { variant: 'error' }),
            });
          }}
        />
      </Paper>

      <CreateInviteDialog
        open={isCreateOpen}
        form={form}
        createdLink={createdLink}
        currentUserRole={currentUserRole}
        isCreating={createInvite.isPending}
        disabled={!canManage}
        onClose={closeDialog}
        onFormChange={updateForm}
        onCreate={handleCreate}
        onCopyLink={copyLink}
      />
    </>
  );
};

export default WorkspaceInvitesSection;
