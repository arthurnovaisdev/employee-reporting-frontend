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
        },
        containedPrimary: {
          '&:hover': {
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
  },
})
