import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

// Professional Security Tool Theme - Dark Mode with Cyber Aesthetics
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00d4ff',
      light: '#5eefff',
      dark: '#00a3cc',
      contrastText: '#0a1929',
    },
    secondary: {
      main: '#7c4dff',
      light: '#b47cff',
      dark: '#3f1dcb',
    },
    success: {
      main: '#00e676',
      light: '#66ffa6',
      dark: '#00b248',
    },
    warning: {
      main: '#ffab00',
      light: '#ffd740',
      dark: '#ff8f00',
    },
    error: {
      main: '#ff1744',
      light: '#ff616f',
      dark: '#c4001d',
    },
    info: {
      main: '#00b0ff',
      light: '#69e2ff',
      dark: '#0081cb',
    },
    background: {
      default: '#0a1929',
      paper: '#0d2137',
    },
    text: {
      primary: '#e3f2fd',
      secondary: '#90caf9',
    },
    divider: 'rgba(0, 212, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#1e3a5f #0a1929',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#1e3a5f',
            border: '2px solid #0a1929',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: '#0a1929',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #0d2137 0%, #132f4c 100%)',
          borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.5)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(180deg, #0d2137 0%, #071318 100%)',
          borderRight: '1px solid rgba(0, 212, 255, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(145deg, #0d2137 0%, #132f4c 100%)',
          border: '1px solid rgba(0, 212, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px rgba(0, 212, 255, 0.15)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 20px',
          transition: 'all 0.2s ease-in-out',
        },
        contained: {
          background: 'linear-gradient(45deg, #00d4ff 0%, #7c4dff 100%)',
          boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #00a3cc 0%, #3f1dcb 100%)',
            boxShadow: '0 6px 20px rgba(0, 212, 255, 0.4)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: 'rgba(0, 212, 255, 0.5)',
          '&:hover': {
            borderColor: '#00d4ff',
            backgroundColor: 'rgba(0, 212, 255, 0.08)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
        colorSuccess: {
          background: 'linear-gradient(45deg, #00e676 0%, #00c853 100%)',
          color: '#0a1929',
        },
        colorError: {
          background: 'linear-gradient(45deg, #ff1744 0%, #d50000 100%)',
        },
        colorWarning: {
          background: 'linear-gradient(45deg, #ffab00 0%, #ff8f00 100%)',
          color: '#0a1929',
        },
        colorInfo: {
          background: 'linear-gradient(45deg, #00b0ff 0%, #0091ea 100%)',
        },
        // Outlined variants with better visibility
        outlinedPrimary: {
          borderColor: '#00d4ff',
          color: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.15)',
        },
        outlinedSecondary: {
          borderColor: '#7c4dff',
          color: '#b47cff',
          backgroundColor: 'rgba(124, 77, 255, 0.15)',
        },
        outlinedSuccess: {
          borderColor: '#00e676',
          color: '#ffffff',
          backgroundColor: 'rgba(0, 230, 118, 0.5)',
          fontWeight: 600,
        },
        outlinedError: {
          borderColor: '#ff5252',
          color: '#ffffff',
          backgroundColor: 'rgba(255, 82, 82, 0.6)',
          fontWeight: 600,
        },
        outlinedWarning: {
          borderColor: '#ffab00',
          color: '#ffab00',
          backgroundColor: 'rgba(255, 171, 0, 0.15)',
        },
        outlinedInfo: {
          borderColor: '#00b0ff',
          color: '#00b0ff',
          backgroundColor: 'rgba(0, 176, 255, 0.15)',
        },
        outlinedDefault: {
          borderColor: '#90caf9',
          color: '#90caf9',
          backgroundColor: 'rgba(144, 202, 249, 0.15)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            '& fieldset': {
              borderColor: 'rgba(0, 212, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 212, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#00d4ff',
              borderWidth: 2,
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              '& fieldset': {
                borderColor: 'rgba(0, 212, 255, 0.1)',
              },
            },
          },
          '& .MuiInputBase-input': {
            color: '#e3f2fd',
            '&::placeholder': {
              color: '#5c7a99',
              opacity: 1,
            },
          },
          '& .MuiInputLabel-root': {
            color: '#90caf9',
            '&.Mui-focused': {
              color: '#00d4ff',
            },
          },
          '& .MuiFormHelperText-root': {
            color: '#7a9cbf',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          '&::placeholder': {
            color: '#5c7a99',
            opacity: 1,
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#90caf9',
          '&.Mui-focused': {
            color: '#00d4ff',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 212, 255, 0.1)',
        },
        head: {
          fontWeight: 600,
          backgroundColor: 'rgba(0, 212, 255, 0.05)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 212, 255, 0.05) !important',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          '&.Mui-selected': {
            background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.15) 0%, rgba(124, 77, 255, 0.15) 100%)',
            borderLeft: '3px solid #00d4ff',
            '&:hover': {
              background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.2) 0%, rgba(124, 77, 255, 0.2) 100%)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 212, 255, 0.08)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardSuccess: {
          backgroundColor: 'rgba(0, 230, 118, 0.1)',
          border: '1px solid rgba(0, 230, 118, 0.3)',
        },
        standardError: {
          backgroundColor: 'rgba(255, 23, 68, 0.1)',
          border: '1px solid rgba(255, 23, 68, 0.3)',
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 171, 0, 0.1)',
          border: '1px solid rgba(255, 171, 0, 0.3)',
        },
        standardInfo: {
          backgroundColor: 'rgba(0, 176, 255, 0.1)',
          border: '1px solid rgba(0, 176, 255, 0.3)',
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          background: 'rgba(13, 33, 55, 0.8)',
          border: '1px solid rgba(0, 212, 255, 0.1)',
          '&:before': {
            display: 'none',
          },
          '&.Mui-expanded': {
            margin: '8px 0',
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(0, 212, 255, 0.05)',
          },
        },
        expandIconWrapper: {
          color: '#00d4ff',
        },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderTop: '1px solid rgba(0, 212, 255, 0.1)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 212, 255, 0.15)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: 'linear-gradient(145deg, #0d2137 0%, #132f4c 100%)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
        },
        bar: {
          background: 'linear-gradient(90deg, #00d4ff 0%, #7c4dff 100%)',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#00d4ff',
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
