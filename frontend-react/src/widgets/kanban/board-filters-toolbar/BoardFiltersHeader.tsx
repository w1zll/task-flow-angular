'use client';

import {
  ExpandMoreOutlined,
  FilterListOutlined,
} from '@mui/icons-material';
import {
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';

interface BoardFiltersHeaderProps {
  filteredCount: number;
  totalCount: number;
  isFiltering: boolean;
  isDesktopExpanded: boolean;
  desktopPanelId: string;
  onToggleDesktopExpanded: () => void;
}

const BoardFiltersHeader = ({
  filteredCount,
  totalCount,
  isFiltering,
  isDesktopExpanded,
  desktopPanelId,
  onToggleDesktopExpanded,
}: BoardFiltersHeaderProps) => {
  const t = useTranslations('BoardPage.filters');

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', minWidth: 0 }}
      >
        <FilterListOutlined color="primary" fontSize="small" />
        <Typography
          variant="subtitle2"
          aria-live="polite"
          sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
        >
          {t('summary', {
            filtered: filteredCount,
            total: totalCount,
          })}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: { xs: 'space-between', sm: 'flex-end' },
        }}
      >
        {isFiltering && (
          <CircularProgress
            size={16}
            thickness={5}
            aria-label={t('loadingResults')}
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          />
        )}
        <Tooltip
          title={t(isDesktopExpanded ? 'collapse' : 'expand')}
          describeChild
        >
          <IconButton
            size="small"
            onClick={onToggleDesktopExpanded}
            aria-label={t(isDesktopExpanded ? 'collapse' : 'expand')}
            aria-controls={desktopPanelId}
            aria-expanded={isDesktopExpanded}
            sx={{
              display: 'inline-flex',
              transition: 'transform 160ms ease',
              transform: isDesktopExpanded
                ? 'rotate(180deg)'
                : 'rotate(0deg)',
            }}
          >
            <ExpandMoreOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
};

export default BoardFiltersHeader;
