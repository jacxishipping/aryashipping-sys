import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Eye, EyeOff, Copy, Check, Package, Key } from 'lucide-react';
import { Box, Typography, IconButton, Slide } from '@mui/material';
import { Button } from '@/components/design-system';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt?: string;
  _count?: {
    shipments: number;
  };
}

interface UserCardProps {
  user: UserData;
  index: number;
  highlighted?: boolean;
  showEmail: boolean;
  copiedEmail: string | null;
  onToggleEmail: (id: string) => void;
  onCopyEmail: (text: string, id: string) => void;
  onDelete: (id: string) => void;
  onResetPassword?: (user: UserData) => void;
}

const formatRole = (role: string) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const maskEmail = (email: string) => {
  const [username, domain] = email.split('@');
  if (username.length <= 3) {
    return `${username[0]}***@${domain}`;
  }
  return `${username.substring(0, 3)}***@${domain}`;
};

export default function UserCard({
  user,
  index,
  highlighted = false,
  showEmail,
  copiedEmail,
  onToggleEmail,
  onCopyEmail,
  onDelete,
  onResetPassword,
}: UserCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 60);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <Slide in={visible} direction="up" timeout={600}>
      <Box
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: 2,
          background: 'var(--panel)',
          boxShadow: highlighted
            ? '0 36px 48px rgba(56,189,248,0.12)'
            : '0 18px 32px rgba(var(--text-primary-rgb), 0.08)',
          border: highlighted ? '1px solid rgba(56,189,248,0.14)' : 'none',
          transition: 'transform 200ms ease, box-shadow 200ms ease, border 200ms ease',
          '&:hover': {
            transform: 'translateY(-6px)',
            boxShadow: highlighted
              ? '0 46px 58px rgba(56,189,248,0.16)'
              : '0 28px 48px rgba(var(--text-primary-rgb), 0.12)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'rgba(6,182,212,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User style={{ width: 20, height: 20, color: 'var(--accent-gold)' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }} noWrap>
              {user.name || 'Unnamed User'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {formatRole(user.role)}
            </Typography>
          </Box>
          <Box>
            <IconButton
              size="small"
              onClick={() => onToggleEmail(user.id)}
              title="Toggle email visibility"
            >
              {showEmail ? (
                <EyeOff style={{ width: 16, height: 16 }} />
              ) : (
                <Eye style={{ width: 16, height: 16 }} />
              )}
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
            Email
          </Typography>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace' }} noWrap>
              {showEmail ? user.email : maskEmail(user.email)}
            </Typography>
            {showEmail && (
              <IconButton
                size="small"
                onClick={() => onCopyEmail(user.email, user.id)}
                title="Copy email"
              >
                {copiedEmail === user.id ? (
                  <Check style={{ color: 'green', width: 16, height: 16 }} />
                ) : (
                  <Copy style={{ color: 'var(--accent-gold)', width: 16, height: 16 }} />
                )}
              </IconButton>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 90 }}>
            Shipments
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Package style={{ width: 14, height: 14, color: 'var(--text-secondary)' }} />
            <Typography variant="body2" color="text.primary" fontWeight="600">
              {user._count?.shipments ?? 0}
            </Typography>
          </Box>
        </Box>

        {user.createdAt && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
            <Typography variant="caption" color="text.secondary">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
          <Button
            href={`/dashboard/users/${user.id}`}
            variant="outline"
            size="sm"
            icon={<VisibilityIcon />}
            sx={{ textTransform: 'none', fontSize: '0.7rem' }}
          >
            View
          </Button>
          {onResetPassword && (
            <Button
              variant="outline"
              size="sm"
              icon={<Key style={{ width: 14, height: 14 }} />}
              onClick={() => onResetPassword(user)}
              sx={{ textTransform: 'none', fontSize: '0.7rem' }}
            >
              Password
            </Button>
          )}
          <Button
            href={`/dashboard/users/${user.id}/edit`}
            variant="ghost"
            size="sm"
            icon={<EditIcon />}
            sx={{ textTransform: 'none', fontSize: '0.7rem' }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<DeleteIcon />}
            onClick={() => onDelete(user.id)}
            sx={{ color: 'var(--error)' }}
          >
            Delete
          </Button>
        </Box>
      </Box>
    </Slide>
  );
}
