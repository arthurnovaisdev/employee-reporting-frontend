import { createTheme } from '@mui/material/styles'

const graphite = '#121310'
const surface = '#1b1c18'
const surfaceElevated = '#23241f'
const amber = '#d9981b'

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: amber,
      contrastText: '#16130d',
    },
    background: {
      default: graphite,
      paper: surface,
    },
    text: {
      primary: '#f4f2ed',
      secondary: '#b8b7af',
      disabled: '#8e8e86',
    },
    divider: '#36372f',
    success: {
      main: '#57a070',
    },
    warning: {
      main: '#c78c20',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontSize: 'clamp(1.7rem, 5vw, 2.125rem)',
    },
    h5: {
      fontWeight: 700,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #30312b',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 7,
          boxShadow: 'none',
          minHeight: 44,
          '&:focus-visible': {
            outline: '3px solid rgba(217, 152, 27, 0.38)',
            outlineOffset: 2,
          },
          '&.MuiButton-containedPrimary:hover': {
            backgroundColor: '#e5a326',
            boxShadow: 'none',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: surfaceElevated,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3a3b32',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#575848',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
          '&:focus-visible': {
            outline: '3px solid rgba(217, 152, 27, 0.38)',
            outlineOffset: 2,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          '&:focus-visible': {
            outline: '3px solid rgba(217, 152, 27, 0.38)',
            outlineOffset: -2,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          width: 'calc(100% - 32px)',
          maxHeight: 'calc(100dvh - 32px)',
          margin: 16,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: ({ theme }) => ({
          padding: theme.spacing(2),
          gap: theme.spacing(1),
          flexWrap: 'wrap',
          [theme.breakpoints.down('sm')]: {
            alignItems: 'stretch',
            flexDirection: 'column-reverse',
            '& > :not(style)': {
              width: '100%',
              marginLeft: 0,
            },
          },
        }),
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          marginRight: 0,
        },
      },
    },
    MuiSkeleton: {
      defaultProps: {
        animation: 'wave',
      },
    },
  },
})
