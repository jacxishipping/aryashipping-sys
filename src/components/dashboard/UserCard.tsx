import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Eye, EyeOff, Copy, Check, Package, Key, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/design-system';

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
    <div
      className={`p-4 md:p-5 rounded-2xl bg-[var(--panel)] transition-all duration-200 border ${
        highlighted
          ? 'border-sky-400/30 shadow-[0_36px_48px_rgba(56,189,248,0.12)] hover:shadow-[0_46px_58px_rgba(56,189,248,0.16)]'
          : 'border-[var(--border)] shadow-[0_18px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_28px_48px_rgba(0,0,0,0.1)]'
      } hover:-translate-y-1 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-[var(--accent-gold)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-[var(--text-primary)] truncate">
            {user.name || 'Unnamed User'}
          </p>
          <p className="text-xs text-[var(--text-secondary)] truncate">
            {formatRole(user.role)}
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={() => onToggleEmail(user.id)}
            title="Toggle email visibility"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
          >
            {showEmail ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-[var(--text-secondary)] min-w-[70px]">
          Email
        </span>
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[var(--text-primary)] truncate">
            {showEmail ? user.email : maskEmail(user.email)}
          </span>
          {showEmail && (
            <button
              type="button"
              onClick={() => onCopyEmail(user.email, user.id)}
              title="Copy email"
              className="p-1 rounded text-[var(--accent-gold)] hover:bg-[var(--background)] transition-colors"
            >
              {copiedEmail === user.id ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 text-xs">
        <span className="text-[var(--text-secondary)] min-w-[70px]">
          Shipments
        </span>
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          <span className="font-semibold text-[var(--text-primary)]">
            {user._count?.shipments ?? 0}
          </span>
        </div>
      </div>

      {user.createdAt && (
        <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
          <p className="text-[11px] text-[var(--text-secondary)]">
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 justify-end mt-3 pt-1">
        <Button
          href={`/dashboard/users/${user.id}`}
          variant="outline"
          size="sm"
          icon={<Eye className="w-3.5 h-3.5" />}
        >
          View
        </Button>
        {onResetPassword && (
          <Button
            variant="outline"
            size="sm"
            icon={<Key className="w-3.5 h-3.5" />}
            onClick={() => onResetPassword(user)}
          >
            Password
          </Button>
        )}
        <Button
          href={`/dashboard/users/${user.id}/edit`}
          variant="ghost"
          size="sm"
          icon={<Pencil className="w-3.5 h-3.5" />}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 className="w-3.5 h-3.5 text-[var(--error)]" />}
          onClick={() => onDelete(user.id)}
        >
          <span className="text-[var(--error)]">Delete</span>
        </Button>
      </div>
    </div>
  );
}
