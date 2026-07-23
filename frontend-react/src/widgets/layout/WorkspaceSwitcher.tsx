'use client';

import { useStableBodyScrollLock } from '@/shared/lib/useStableBodyScrollLock';
import {
  useCreateWorkspace,
  useSwitchWorkspace,
  useWorkspaces,
} from '@/shared/queries/workspaces.queries';
import { useAuthStore } from '@/shared/store/root.store';
import {
  Add,
  Business,
  Check,
  ExpandMore,
  Settings,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

const WorkspaceSwitcher = () => {
  const t = useTranslations('WorkspaceSwitcher');
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const setActiveWorkspace = useAuthStore(
    (state) => state.setActiveWorkspace,
  );
  const workspaces = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const switchWorkspace = useSwitchWorkspace();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const createDialogTitleId = 'workspace-switcher-create-dialog-title';
  const switcherMenuId = 'workspace-switcher-menu';
  const activeWorkspace = workspaces.data?.find(
    (workspace) => workspace.isActive,
  );

  useStableBodyScrollLock(isCreateOpen);

  const activateWorkspace = (workspaceId: string) => {
    setAnchorEl(null);
    if (workspaceId === activeWorkspace?.id) return;

    switchWorkspace.mutate(workspaceId, {
      onSuccess: (workspace) => {
        setActiveWorkspace(workspace.id);
        router.push(`/workspaces/${workspace.id}`);
        router.refresh();
      },
      onError: () =>
        enqueueSnackbar(t('switchError'), { variant: 'error' }),
    });
  };

  const handleCreate = () => {
    const name = workspaceName.trim();
    if (!name) return;

    createWorkspace.mutate(name, {
      onSuccess: (workspace) => {
        setActiveWorkspace(workspace.id);
        setWorkspaceName('');
        setCreateOpen(false);
        setAnchorEl(null);
        router.push(`/workspaces/${workspace.id}`);
        router.refresh();
      },
      onError: () =>
        enqueueSnackbar(t('createError'), { variant: 'error' }),
    });
  };

  if (workspaces.isLoading) {
    return (
      <Skeleton
        variant="rounded"
        width={150}
        height={36}
        sx={{ display: { xs: 'none', sm: 'block' } }}
      />
    );
  }

  if (!activeWorkspace) return null;

  return (
    <>
      <Button
        color="inherit"
        startIcon={<Business />}
        endIcon={<ExpandMore />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-controls={anchorEl ? switcherMenuId : undefined}
        aria-haspopup="menu"
        aria-expanded={anchorEl ? 'true' : undefined}
        sx={{
          maxWidth: { xs: 112, sm: 170, md: 220 },
          minWidth: 0,
          justifyContent: 'flex-start',
          textTransform: 'none',
          fontWeight: 600,
          px: { xs: 1, sm: 1.5 },
          '& .MuiButton-startIcon': {
            display: { xs: 'none', sm: 'inherit' },
          },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontWeight: 600,
            lineHeight: 1.2,
            overflowWrap: 'anywhere',
          }}
        >
          {activeWorkspace.name}
        </Typography>
      </Button>

      <Menu
        id={switcherMenuId}
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { minWidth: 250, maxWidth: 320 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="overline" color="text.secondary">
            {t('title')}
          </Typography>
        </Box>
        {workspaces.data?.map((workspace) => (
          <MenuItem
            key={workspace.id}
            selected={workspace.isActive}
            onClick={() => activateWorkspace(workspace.id)}
          >
            <ListItemIcon>
              {workspace.isActive ? <Check fontSize="small" /> : <Business fontSize="small" />}
            </ListItemIcon>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{ overflowWrap: 'anywhere' }}
              >
                {workspace.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {workspace.isPersonal
                  ? t('personal')
                  : t(`role.${workspace.currentUserRole}`)}
              </Typography>
            </Box>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            router.push(`/workspaces/${activeWorkspace.id}/settings`);
          }}
        >
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          {t('settings')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setCreateOpen(true);
          }}
        >
          <ListItemIcon>
            <Add fontSize="small" />
          </ListItemIcon>
          {t('create')}
        </MenuItem>
      </Menu>

      <Dialog
        open={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        aria-labelledby={createDialogTitleId}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id={createDialogTitleId}>{t('createTitle')}</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <TextField
            autoFocus
            fullWidth
            label={t('name')}
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleCreate();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!workspaceName.trim() || createWorkspace.isPending}
          >
            {createWorkspace.isPending ? t('creating') : t('createAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkspaceSwitcher;
