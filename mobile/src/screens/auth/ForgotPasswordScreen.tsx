import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { AuthScreenShell } from '../../components/shared/AuthScreenShell';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('error');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);
      await authApi.forgotPassword(data.email);
      setToastType('success');
      setToastMessage('Password reset link sent to your email');
      setShowToast(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      setToastType('error');
      setToastMessage(error.message || 'Failed to send reset link');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthScreenShell
        section="Reset Password"
        detail="Recover account access from mobile"
        title="Forgot Password?"
        description="Enter your email address and we'll send you a reset link so you can get back into your workspace."
        icon="resetPassword"
        showBack
      >
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="Enter your email"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.email?.message}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              containerStyle={styles.input}
            />
          )}
        />

        <Text style={[styles.helper, { color: colors.textSecondary }]}>The reset link is sent to the email connected to your Jacxi account.</Text>

        <Button
          title="Send Reset Link"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          fullWidth
          style={styles.button}
        />
      </AuthScreenShell>

      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    marginBottom: Spacing.lg,
  },
  helper: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.base,
  },
  button: {
    marginTop: Spacing.lg,
  },
});

export default ForgotPasswordScreen;
