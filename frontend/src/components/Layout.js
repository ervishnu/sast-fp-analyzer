import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  BugReport as BugIcon,
  Radar as RadarIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', description: 'Overview & Stats' },
  { text: 'Configurations', icon: <SettingsIcon />, path: '/configurations', description: 'Project Settings' },
  { text: 'Scans', icon: <RadarIcon />, path: '/scans', description: 'Analysis History' },
];

const settingsItems = [
  { text: 'Default Settings', icon: <TuneIcon />, path: '/settings', description: 'Global Defaults' },
];

function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Section */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(45deg, #00d4ff 0%, #7c4dff 100%)',
              borderRadius: '12px',
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 212, 255, 0.3)',
            }}
          >
            <ShieldIcon sx={{ fontSize: 32, color: '#0a1929' }} />
          </Box>
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(90deg, #00d4ff 0%, #7c4dff 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.5px',
          }}
        >
          SAST Analyzer
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          False Positive Detection
        </Typography>
        <Chip
          label="v1.0"
          size="small"
          sx={{
            mt: 1,
            fontSize: '0.65rem',
            height: 20,
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            color: '#00d4ff',
          }}
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(0, 212, 255, 0.1)', mx: 2 }} />

      {/* Main Navigation */}
      <Box sx={{ px: 1, py: 2 }}>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            px: 2,
            fontSize: '0.65rem',
            letterSpacing: '1.5px',
          }}
        >
          Main Menu
        </Typography>
        <List sx={{ pt: 1 }}>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={location.pathname.startsWith(item.path)}
                onClick={() => navigate(item.path)}
                sx={{
                  py: 1.5,
                  '& .MuiListItemIcon-root': {
                    minWidth: 40,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname.startsWith(item.path)
                      ? '#00d4ff'
                      : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: location.pathname.startsWith(item.path) ? 600 : 400,
                    fontSize: '0.9rem',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.7rem',
                    sx: { opacity: 0.7 },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      <Divider sx={{ borderColor: 'rgba(0, 212, 255, 0.1)', mx: 2 }} />

      {/* Settings Section */}
      <Box sx={{ px: 1, py: 2 }}>
        <Typography
          variant="overline"
          sx={{
            color: 'text.secondary',
            px: 2,
            fontSize: '0.65rem',
            letterSpacing: '1.5px',
          }}
        >
          Settings
        </Typography>
        <List sx={{ pt: 1 }}>
          {settingsItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  py: 1.5,
                  '& .MuiListItemIcon-root': {
                    minWidth: 40,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname === item.path
                      ? '#00d4ff'
                      : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 600 : 400,
                    fontSize: '0.9rem',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.7rem',
                    sx: { opacity: 0.7 },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ borderColor: 'rgba(0, 212, 255, 0.1)', mb: 2 }} />
        <Box
          sx={{
            background: 'rgba(0, 212, 255, 0.05)',
            borderRadius: 2,
            p: 1.5,
            border: '1px solid rgba(0, 212, 255, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugIcon sx={{ color: '#7c4dff', fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Powered by AI Analysis
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', width: '100%' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon sx={{ color: '#00d4ff' }} />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              {[...menuItems, ...settingsItems].find((item) => location.pathname.startsWith(item.path))?.text || 'SAST Analyzer'}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Chip
            icon={<ShieldIcon sx={{ fontSize: 16 }} />}
            label="Security Mode Active"
            size="small"
            sx={{
              background: 'rgba(0, 230, 118, 0.1)',
              border: '1px solid rgba(0, 230, 118, 0.3)',
              color: '#00e676',
              '& .MuiChip-icon': {
                color: '#00e676',
              },
            }}
          />
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
