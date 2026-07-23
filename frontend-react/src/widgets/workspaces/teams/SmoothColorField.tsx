'use client';

import { Chip, Stack, TextField } from '@mui/material';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

const COLOR_PREVIEW_DEBOUNCE_MS = 120;

interface SmoothColorFieldProps {
  label: string;
  value: string;
  previewLabel: string;
  onInputColor: (color: string) => void;
  onCommitColor: (color: string) => void;
}

const SmoothColorField = ({
  label,
  value,
  previewLabel,
  onInputColor,
  onCommitColor,
}: SmoothColorFieldProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const pendingColorRef = useRef(value);
  const onInputColorRef = useRef(onInputColor);
  const onCommitColorRef = useRef(onCommitColor);
  const [previewColor, setPreviewColor] = useState(value);

  useEffect(() => {
    onInputColorRef.current = onInputColor;
  }, [onInputColor]);

  useEffect(() => {
    onCommitColorRef.current = onCommitColor;
  }, [onCommitColor]);

  useEffect(() => {
    pendingColorRef.current = value;
    setPreviewColor(value);
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const flushColorUpdate = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const nextColor = pendingColorRef.current;
    setPreviewColor(nextColor);
    onCommitColorRef.current(nextColor);
  }, []);

  const schedulePreviewUpdate = useCallback((color: string) => {
    pendingColorRef.current = color;
    onInputColorRef.current(color);

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      setPreviewColor(pendingColorRef.current);
    }, COLOR_PREVIEW_DEBOUNCE_MS);
  }, []);

  const handleColorInput = (event: FormEvent<HTMLInputElement>) => {
    schedulePreviewUpdate(event.currentTarget.value);
  };

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <TextField
        label={label}
        type="color"
        defaultValue={value}
        inputRef={inputRef}
        sx={{ width: 100 }}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: {
            'aria-label': label,
            onBlur: flushColorUpdate,
            onChange: handleColorInput,
            onInput: handleColorInput,
          },
        }}
      />
      <Chip
        label={previewLabel}
        sx={{ bgcolor: previewColor, color: '#fff', fontWeight: 600 }}
      />
    </Stack>
  );
};

export default SmoothColorField;
