import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import { Alert, Box, Button, CircularProgress, IconButton, Stack, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import { attachmentMimeTypes, validateAttachments } from './attachments'

interface AttachmentPickerProps {
  files: File[]
  onChange: (files: File[]) => void
  disabled: boolean
  validating?: boolean
  onValidating: (validating: boolean) => void
}

export function AttachmentPicker({ files, onChange, disabled, validating = false, onValidating }: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function selectFiles(selected: File[]) {
    onValidating(true)
    try {
      const next = [...files, ...selected]
      const message = await validateAttachments(next)
      setError(message)
      if (!message) onChange(next)
    } catch {
      setError('Não foi possível verificar os arquivos. Selecione-os novamente.')
    } finally {
      onValidating(false)
    }
  }

  return (
    <Stack spacing={1.25}>
      <Typography id="attachments-label" variant="subtitle2">Anexos <Box component="span" color="text.secondary">(opcional)</Box></Typography>
      <Typography id="attachments-help" variant="body2" color="text.secondary">
        JPEG, PNG ou PDF. Até 10 MB por arquivo e no envio completo, incluindo os dados dos arquivos.
        Você pode enviar a denúncia sem anexos.
      </Typography>
      <input
        ref={inputRef} type="file" multiple hidden accept={attachmentMimeTypes.join(',')}
        disabled={disabled} aria-labelledby="attachments-label" aria-describedby="attachments-help"
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (selected.length) void selectFiles(selected)
        }}
      />
      <Button variant="outlined" startIcon={validating ? <CircularProgress size={18} color="inherit" /> : <AttachFileOutlined />} disabled={disabled}
        onClick={() => inputRef.current?.click()} sx={{ borderStyle: 'dashed', minHeight: 48 }}>
        {validating ? 'Verificando arquivos…' : 'Adicionar arquivos'}
      </Button>
      {error && <Alert severity="error" aria-live="assertive">{error} A seleção anterior foi mantida.</Alert>}
      {files.length > 0 && (
        <Stack component="ul" aria-label="Arquivos selecionados" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {files.map((file, index) => (
            <Box component="li" key={`${file.name}-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
              <AttachFileOutlined sx={{ color: 'text.secondary', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">{(file.size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB</Typography>
              </Box>
              <IconButton size="small" disabled={disabled} aria-label={`Remover ${file.name}`} onClick={() => {
                onChange(files.filter((_, itemIndex) => itemIndex !== index))
                setError(null)
              }}><CloseOutlined fontSize="small" /></IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
