import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined'
import AddBoxOutlined from '@mui/icons-material/AddBoxOutlined'
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined'
import HomeOutlined from '@mui/icons-material/HomeOutlined'
import LogoutOutlined from '@mui/icons-material/LogoutOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import PeopleOutlined from '@mui/icons-material/PeopleOutlined'
import SearchOutlined from '@mui/icons-material/SearchOutlined'
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material'
import { useState, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthContext'
import { BrandLogo } from './BrandLogo'

const drawerWidth = 260

interface NavigationItem {
  label: string
  path: string
  icon: ReactNode
  adminOnly?: boolean
}

const navigationItems: NavigationItem[] = [
  { label: 'Início', path: '/home', icon: <HomeOutlined /> },
  { label: 'Nova denúncia', path: '/reports/new', icon: <AddBoxOutlined /> },
  { label: 'Consultar protocolo', path: '/reports/consult', icon: <SearchOutlined /> },
  { label: 'Denúncias', path: '/admin/reports', icon: <AssignmentOutlined />, adminOnly: true },
  { label: 'Usuários', path: '/admin/users', icon: <PeopleOutlined />, adminOnly: true },
]

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { endSession, session } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ bgcolor: '#f4f2ed', borderRadius: 1.25, px: 1.25, py: 0.8, lineHeight: 0 }}>
          <BrandLogo compact />
        </Box>
      </Box>
      <Divider />
      <List sx={{ px: 1, py: 2 }}>
        {navigationItems
          .filter((item) => !item.adminOnly || session?.role === 'ADMIN')
          .map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path)
                setMobileOpen(false)
              }}
              sx={{ borderRadius: 1.5, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
      </List>
      <Box sx={{ mt: 'auto', p: 1 }}>
        <ListItemButton
          onClick={() => {
            endSession()
            navigate('/login', { replace: true })
          }}
          sx={{ borderRadius: 1.5 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}><LogoutOutlined /></ListItemIcon>
          <ListItemText primary="Sair" />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: '#191a17',
          borderBottom: '1px solid #30312b',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' }, mr: 1 }}
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Ouvidoria Interna
          </Typography>
          <AccountCircleOutlined sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="body2" color="text.secondary" noWrap>
            {session?.name ?? 'Usuário'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" aria-label="Navegação principal">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' } }}
          slotProps={{ paper: { sx: { width: drawerWidth, bgcolor: 'background.paper' } } }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              borderRight: '1px solid #30312b',
            },
          }}
        >
          <Toolbar />
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          ml: { md: `${drawerWidth}px` },
          pt: '64px',
          minHeight: '100vh',
        }}
      >
        <Box sx={{ mx: 'auto', maxWidth: 1180, p: { xs: 2, sm: 3, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
