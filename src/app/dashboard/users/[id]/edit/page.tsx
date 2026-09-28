'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Key,
  Copy,
  RefreshCw,
  Trash2,
  PhoneCall,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  Check,
} from 'lucide-react';
import { Box, Typography, Divider, TextField, InputAdornment, IconButton } from '@mui/material';
import { DashboardSurface, 
  DashboardPanel 
} from '@/components/dashboard/DashboardSurface';
import { Alert, PageHeader, 
  Button, 
  Breadcrumbs, 
  ConfirmDialog,
  FormField, 
  LoadingState,
  Select,
  toast,
} from '@/components/design-system';
import { formatLoginCode, loginCodeToVoiceDigits } from '@/lib/loginCode';
import { hasPermission } from '@/lib/rbac';

const userSchema = z
  .object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    role: z.enum(['user', 'admin', 'manager', 'customer_service']),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.trim() !== '') {
        return data.password.trim().length >= 6;
      }
      return true;
    },
    {
      message: 'Password must be at least 6 characters long',
      path: ['password'],
    }
  )
  .refine(
    (data) => {
      if (data.password && data.password.trim() !== '') {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );

type UserFormData = z.infer<typeof userSchema>;

function generateSecurePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (x) => chars[x % chars.length]).join('');
}

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const voiceAccessCode = loginCode ? loginCodeToVoiceDigits(loginCode) : null;

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const watchPassword = watch('password');

  useEffect(() => {
    if (status === 'loading') return;
    
    // Auth check: admin or users/customers manager
    const canManage =
      session?.user?.role === 'admin' ||
      hasPermission(session?.user?.role, 'users:manage') ||
      hasPermission(session?.user?.role, 'customers:manage');

    if (!session || !canManage) {
      router.replace('/dashboard');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${id}`);
        if (response.ok) {
          const data = await response.json();
          reset({
            name: data.user.name || '',
            email: data.user.email,
            phone: data.user.phone || '',
            address: data.user.address || '',
            city: data.user.city || '',
            country: data.user.country || '',
            role: data.user.role,
            password: '',
            confirmPassword: '',
          });
          setLoginCode(data.user.loginCode || null);
        } else {
          setError('Failed to fetch user details');
        }
      } catch (error) {
        setError('An error occurred while fetching user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, session, status, router, reset]);

  const handleGeneratePassword = () => {
    const pwd = generateSecurePassword();
    setValue('password', pwd, { shouldValidate: true });
    setValue('confirmPassword', pwd, { shouldValidate: true });
    setShowPassword(true);
    setShowConfirmPassword(true);
    setCopiedPassword(false);
    toast.info('Secure password generated');
  };

  const handleCopyGeneratedPassword = async () => {
    const pwd = getValues('password');
    if (!pwd) return;
    try {
      await navigator.clipboard.writeText(pwd);
      setCopiedPassword(true);
      toast.success('Password copied to clipboard');
      setTimeout(() => setCopiedPassword(false), 2500);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setError(null);
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        role: data.role,
      };

      if (data.password && data.password.trim() !== '') {
        payload.password = data.password.trim();
      }

      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          data.password && data.password.trim() !== ''
            ? 'User profile and password updated successfully'
            : 'User profile updated successfully'
        );
        router.push(`/dashboard/users/${id}`);
        router.refresh();
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to update user');
      }
    } catch (error) {
      setError('An error occurred while updating user');
    }
  };

  const handleCopyLoginCode = () => {
    if (!loginCode) return;
    navigator.clipboard.writeText(loginCode);
    toast.success('Login code copied to clipboard');
  };

  const handleCopyVoiceAccessCode = () => {
    if (!voiceAccessCode) return;
    navigator.clipboard.writeText(voiceAccessCode);
    toast.success('Voice access code copied to clipboard');
  };

  const handleGenerateLoginCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await fetch('/api/users/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate login code');
      }

      setLoginCode(data.loginCode);
      toast.success('Login code generated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate login code';
      toast.error(message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const [confirmRemoveCode, setConfirmRemoveCode] = useState(false);

  const handleDeleteLoginCode = () => {
    setConfirmRemoveCode(true);
  };

  const confirmDeleteLoginCode = async () => {
    setConfirmRemoveCode(false);
    setGeneratingCode(true);
    try {
      const response = await fetch(`/api/users/login-code?userId=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove login code');
      }

      setLoginCode(null);
      toast.success('Login code removed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove login code';
      toast.error(message);
    } finally {
      setGeneratingCode(false);
    }
  };

  if (loading || status === 'loading') {
    return <LoadingState />;
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <PageHeader
        title="Edit User"
        description="Update user profile information and security credentials"
        actions={
          <Link href={`/dashboard/users/${id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
              Cancel
            </Button>
          </Link>
        }
      />

      <DashboardPanel className="max-w-2xl mx-auto">
        {error && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="error" icon={<AlertCircle className="w-5 h-5" />}>
              {error}
            </Alert>
          </Box>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            label="Full Name"
            placeholder="John Doe"
            error={!!errors.name}
            helperText={errors.name?.message}
            {...register('name')}
          />

          <FormField
            label="Email Address"
            placeholder="john@example.com"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
          />

          <FormField
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            error={!!errors.phone}
            helperText={errors.phone?.message}
            {...register('phone')}
          />

          <FormField
            label="Address"
            placeholder="123 Main St"
            error={!!errors.address}
            helperText={errors.address?.message}
            {...register('address')}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <FormField
              label="City"
              placeholder="New York"
              error={!!errors.city}
              helperText={errors.city?.message}
              {...register('city')}
            />

            <FormField
              label="Country"
              placeholder="United States"
              error={!!errors.country}
              helperText={errors.country?.message}
              {...register('country')}
            />
          </Box>

          <Box>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  label="Role"
                  value={field.value}
                  onChange={(value) => field.onChange(String(value))}
                  error={errors.role?.message}
                  options={[
                    { value: 'user', label: 'User' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'customer_service', label: 'Customer Service' },
                  ]}
                />
              )}
            />
          </Box>

          <Divider sx={{ my: 3, borderColor: 'var(--border)' }} />

          {/* Password Management Section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Shield className="w-4 h-4 text-[var(--accent-gold)]" />
                Password & Security
              </Typography>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleGeneratePassword}
              >
                Generate Strong Password
              </Button>
            </Box>

            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block' }}>
              Leave blank to keep existing password. If entering a new password, it must be at least 6 characters.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 0.5, display: 'block' }}>
                  New Password
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  {...register('password')}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword((prev) => !prev)}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 0.5, display: 'block' }}>
                  Confirm New Password
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>

            {watchPassword && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'var(--background)', borderRadius: 2, border: '1px solid var(--border)' }}>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                  A new password is ready to be set upon saving.
                </Typography>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={copiedPassword ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                  onClick={handleCopyGeneratedPassword}
                >
                  {copiedPassword ? 'Copied' : 'Copy Password'}
                </Button>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3, borderColor: 'var(--border)' }} />

          {/* Login Code Management Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key className="w-4 h-4" />
              Login Code Management
            </Typography>
            
            {loginCode ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 1, display: 'block' }}>
                    Current Login Code
                  </Typography>
                  <Box 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: 'var(--background)',
                      border: '2px solid var(--accent-gold)',
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Key className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                    <Box 
                      sx={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.2em',
                        flex: 1,
                      }}
                    >
                      {formatLoginCode(loginCode)}
                    </Box>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="w-4 h-4" />}
                      onClick={handleCopyLoginCode}
                      type="button"
                    >
                      Copy
                    </Button>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={handleGenerateLoginCode}
                    disabled={generatingCode}
                    type="button"
                  >
                    {generatingCode ? 'Regenerating...' : 'Regenerate Code'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDeleteLoginCode}
                    disabled={generatingCode}
                    type="button"
                  >
                    Remove Code
                  </Button>
                </Box>

                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  This user can login using this code at <Box component="span" sx={{ color: 'var(--accent-gold)', fontWeight: 500 }}>/auth/simple-login</Box>
                </Typography>

                <Alert severity="info" icon={<PhoneCall className="w-4 h-4" />}>
                  The call agent asks for an 8-digit phone keypad code. If this access code contains letters, share the keypad version below with the customer for phone support.
                </Alert>

                {voiceAccessCode ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      bgcolor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block' }}>
                      Voice keypad code for the call agent
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Box
                        sx={{
                          fontSize: '1.25rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                          letterSpacing: '0.2em',
                          flex: 1,
                        }}
                      >
                        {formatLoginCode(voiceAccessCode)}
                      </Box>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Copy className="w-4 h-4" />}
                        onClick={handleCopyVoiceAccessCode}
                        type="button"
                      >
                        Copy Voice Code
                      </Button>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.6 }}>
                      Standard phone mapping: ABC = 2, DEF = 3, GHI = 4, JKL = 5, MNO = 6, PQRS = 7, TUV = 8, WXYZ = 9.
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'var(--background)', borderRadius: 2, border: '1px dashed var(--border)' }}>
                <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 2 }}>
                  No login code set for this user
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block', mb: 2, lineHeight: 1.5 }}>
                  Generate a login code first to enable both simple login and phone-call access for this user.
                </Typography>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Key className="w-4 h-4" />}
                  onClick={handleGenerateLoginCode}
                  disabled={generatingCode}
                  type="button"
                >
                  {generatingCode ? 'Generating...' : 'Generate Login Code'}
                </Button>
              </Box>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
            <Link href={`/dashboard/users/${id}`} style={{ textDecoration: 'none' }}>
              <Button variant="ghost" type="button">Cancel</Button>
            </Link>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </DashboardPanel>

      <ConfirmDialog
        open={confirmRemoveCode}
        onClose={() => setConfirmRemoveCode(false)}
        onConfirm={() => void confirmDeleteLoginCode()}
        title="Remove Login Code"
        message="Are you sure you want to remove this login code? The user will no longer be able to use it to login."
        confirmText="Remove"
        severity="warning"
        loading={generatingCode}
      />
    </DashboardSurface>
  );
}
