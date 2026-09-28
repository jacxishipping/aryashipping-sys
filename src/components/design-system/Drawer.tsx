"use client";

import { 
  Drawer as MuiDrawer, 
  IconButton, 
  Box, 
  Typography, 
  SxProps, 
  Theme 
} from '@mui/material';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  anchor?: 'right' | 'left';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  className?: string;
  contentSx?: SxProps<Theme>;
}

const sizeConfig = {
  sm: '420px',
  md: '580px',
  lg: '760px',
  xl: '920px',
  full: '95vw',
};

export default function Drawer({
  open,
  onClose,
  title,
  description,
  badge,
  children,
  actions,
  anchor = 'right',
  size = 'md',
  showCloseButton = true,
  className,
  contentSx,
}: DrawerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const drawerWidth = sizeConfig[size] || sizeConfig.md;

  return (
    <MuiDrawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      className={className}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: drawerWidth },
          maxWidth: '100vw',
          bgcolor: 'var(--panel-bg, #FFFFFF)',
          color: 'var(--text-primary, #111827)',
          borderLeft: '1px solid var(--border, #E5E7EB)',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          transition: 'transform 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        },
      }}
      BackdropProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          transition: 'opacity 240ms ease',
        },
      }}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            p: 2.5,
            borderBottom: '1px solid var(--border, #E5E7EB)',
            bgcolor: 'var(--background, #F9FAFB)',
            gap: 2,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: description ? 0.5 : 0 }}>
              {typeof title === 'string' ? (
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: 'var(--text-primary, #111827)',
                    lineHeight: 1.3,
                  }}
                  noWrap
                >
                  {title}
                </Typography>
              ) : (
                title
              )}
              {badge}
            </Box>
            {description && (
              <Typography
                variant="body2"
                sx={{
                  color: 'var(--text-secondary, #6B7280)',
                  fontSize: '0.8125rem',
                  lineHeight: 1.4,
                }}
              >
                {description}
              </Typography>
            )}
          </Box>

          {showCloseButton && (
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: 'var(--text-secondary, #6B7280)',
                p: 0.75,
                borderRadius: 1.5,
                border: '1px solid var(--border, #E5E7EB)',
                bgcolor: 'var(--panel-bg, #FFFFFF)',
                '&:hover': {
                  bgcolor: 'var(--background, #F3F4F6)',
                  color: 'var(--text-primary, #111827)',
                },
              }}
              aria-label="Close drawer"
            >
              <X style={{ width: 18, height: 18 }} />
            </IconButton>
          )}
        </Box>
      )}

      {/* Main Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          ...contentSx,
        }}
      >
        {children}
      </Box>

      {/* Footer Actions */}
      {actions && (
        <Box
          sx={{
            p: 2.5,
            borderTop: '1px solid var(--border, #E5E7EB)',
            bgcolor: 'var(--background, #F9FAFB)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1.5,
          }}
        >
          {actions}
        </Box>
      )}
    </MuiDrawer>
  );
}
