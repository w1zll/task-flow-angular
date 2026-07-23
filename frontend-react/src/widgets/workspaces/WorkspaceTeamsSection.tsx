'use client';

import type { Team } from '@/shared/api/api';
import { useIsOffline } from '@/shared/hooks/useOnlineStatus';
import {
  useAddTeamMember,
  useCreateTeam,
  useDeleteTeam,
  useRemoveTeamMember,
  useUpdateTeam,
  useWorkspaceTeams,
} from '@/shared/queries/teams.queries';
import { useWorkspaceMembers } from '@/shared/queries/workspaces.queries';
import { Add } from '@mui/icons-material';
import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useSnackbar } from 'notistack';
import { useCallback, useMemo, useRef, useState } from 'react';
import DeleteTeamDialog from './teams/DeleteTeamDialog';
import TeamEditorDialog from './teams/TeamEditorDialog';
import TeamList from './teams/TeamList';
import TeamMembersDialog from './teams/TeamMembersDialog';
import type { TeamForm } from './teams/types';

interface Props {
  workspaceId: string;
  canManage: boolean;
}

const initialForm: TeamForm = {
  name: '',
  description: '',
  color: '#669266',
};

const WorkspaceTeamsSection = ({ workspaceId, canManage }: Props) => {
  const t = useTranslations('WorkspaceTeams');
  const { enqueueSnackbar } = useSnackbar();
  const isOffline = useIsOffline();
  const canManageOnline = canManage && !isOffline;
  const teams = useWorkspaceTeams(workspaceId);
  const workspaceMembers = useWorkspaceMembers(workspaceId);
  const createTeam = useCreateTeam(workspaceId);
  const updateTeam = useUpdateTeam(workspaceId);
  const deleteTeam = useDeleteTeam(workspaceId);
  const addMember = useAddTeamMember(workspaceId);
  const removeMember = useRemoveTeamMember(workspaceId);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [managedTeamId, setManagedTeamId] = useState<string | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [form, setForm] = useState<TeamForm>(initialForm);
  const colorValueRef = useRef(initialForm.color);

  const managedTeam = teams.data?.find((team) => team.id === managedTeamId);
  const availableMembers = useMemo(() => {
    const assigned = new Set(
      managedTeam?.members.map((member) => member.userId) ?? [],
    );
    return (
      workspaceMembers.data?.filter(
        (member) => !assigned.has(member.userId),
      ) ?? []
    );
  }, [managedTeam?.members, workspaceMembers.data]);

  const openCreate = () => {
    if (!canManageOnline) return;
    setEditingTeam(null);
    colorValueRef.current = initialForm.color;
    setForm(initialForm);
    setEditorOpen(true);
  };

  const openEdit = (team: Team) => {
    if (!canManageOnline) return;
    setEditingTeam(team);
    colorValueRef.current = team.color;
    setForm({
      name: team.name,
      description: team.description ?? '',
      color: team.color,
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (createTeam.isPending || updateTeam.isPending) return;
    setEditorOpen(false);
  };

  const updateForm = <K extends keyof TeamForm,>(
    key: K,
    value: TeamForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveTeam = () => {
    if (!canManageOnline) return;
    const name = form.name.trim();
    if (!name) return;

    const data = {
      name,
      description: form.description.trim() || undefined,
      color: colorValueRef.current,
    };
    const options = {
      onSuccess: () => {
        setEditorOpen(false);
        enqueueSnackbar(t(editingTeam ? 'updated' : 'created'), {
          variant: 'success',
        });
      },
      onError: () =>
        enqueueSnackbar(t('saveError'), { variant: 'error' }),
    };

    if (editingTeam) {
      updateTeam.mutate({ teamId: editingTeam.id, data }, options);
    } else {
      createTeam.mutate(data, options);
    }
  };

  const handleColorInput = useCallback((color: string) => {
    colorValueRef.current = color;
  }, []);

  const handleColorCommit = useCallback((color: string) => {
    colorValueRef.current = color;
    setForm((current) => ({
      ...current,
      color,
    }));
  }, []);

  const openMembers = (teamId: string) => {
    setManagedTeamId(teamId);
    setSelectedUserId('');
  };

  const requestCloseMembers = () => {
    if (!addMember.isPending && !removeMember.isPending) {
      setManagedTeamId(null);
    }
  };

  const addSelectedMember = () => {
    if (!canManageOnline) return;
    if (!managedTeam || !selectedUserId) return;

    addMember.mutate(
      { teamId: managedTeam.id, userId: selectedUserId },
      {
        onSuccess: () => {
          setSelectedUserId('');
          enqueueSnackbar(t('memberAdded'), { variant: 'success' });
        },
        onError: () =>
          enqueueSnackbar(t('memberError'), { variant: 'error' }),
      },
    );
  };

  const removeSelectedMember = (memberId: string) => {
    if (!canManageOnline) return;
    if (!managedTeam) return;

    removeMember.mutate(
      { teamId: managedTeam.id, memberId },
      {
        onError: () =>
          enqueueSnackbar(t('memberError'), { variant: 'error' }),
      },
    );
  };

  const requestCloseDelete = () => {
    if (!deleteTeam.isPending) {
      setTeamToDelete(null);
    }
  };

  const confirmDeleteTeam = () => {
    if (!canManageOnline) return;
    if (!teamToDelete) return;

    deleteTeam.mutate(teamToDelete.id, {
      onSuccess: () => {
        setTeamToDelete(null);
        enqueueSnackbar(t('deleted'), { variant: 'success' });
      },
      onError: () =>
        enqueueSnackbar(t('deleteError'), { variant: 'error' }),
    });
  };

  return (
    <>
      <Paper
        variant="outlined"
        sx={{ minWidth: 0, borderRadius: '6px', overflow: 'hidden', mt: 3 }}
      >
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            gap: 2,
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
          {canManageOnline && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={openCreate}
              sx={{ flexShrink: 0 }}
            >
              {t('create')}
            </Button>
          )}
        </Box>
        <Divider />

        <TeamList
          teams={teams.data}
          isLoading={teams.isLoading}
          isError={teams.isError}
          canManage={canManageOnline}
          onEdit={openEdit}
          onDelete={setTeamToDelete}
          onManageMembers={openMembers}
        />
      </Paper>

      <TeamEditorDialog
        open={isEditorOpen}
        editingTeam={editingTeam}
        form={form}
        isSaving={createTeam.isPending || updateTeam.isPending}
        onClose={closeEditor}
        onSave={saveTeam}
        onFormChange={updateForm}
        onColorInput={handleColorInput}
        onColorCommit={handleColorCommit}
      />

      <TeamMembersDialog
        team={managedTeam}
        canManage={canManageOnline}
        availableMembers={availableMembers}
        selectedUserId={selectedUserId}
        isAdding={addMember.isPending}
        isRemoving={removeMember.isPending}
        onRequestClose={requestCloseMembers}
        onCloseAction={() => setManagedTeamId(null)}
        onSelectedUserIdChange={setSelectedUserId}
        onAddMember={addSelectedMember}
        onRemoveMember={removeSelectedMember}
      />

      <DeleteTeamDialog
        team={teamToDelete}
        isDeleting={deleteTeam.isPending}
        onRequestClose={requestCloseDelete}
        onCancel={() => setTeamToDelete(null)}
        onConfirm={confirmDeleteTeam}
      />
    </>
  );
};

export default WorkspaceTeamsSection;
