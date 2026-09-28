import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { AuthScreenShell } from '../../components/shared/AuthScreenShell';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

const loginCodeSchema = z.object({
  loginCode: z.string().length(8, 'Login code must be 8 characters'),
});

type LoginCodeFormData = z.infer<typeof loginCodeSchema>;

type LoginCodeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'LoginCode'>;
};

const LoginCodeScreen: React.FC<LoginCodeScreenProps> = () => {
  const { loginWithCode } = useAuth();
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCodeFormData>({
    resolver: zodResolver(loginCodeSchema),
  });

  const onSubmit = async (data: LoginCodeFormData) => {
    try {
      setLoading(true);
      await loginWithCode(data.loginCode.toUpperCase());
    } catch (error: any) {
      setToastMessage(error.message || 'Invalid login code');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthScreenShell
        section="Login Code"
        detail="Simple access for customers and staff"
        title="Use Your Access Code"
        description="Enter the 8-character login code issued for your workspace to sign in quickly from mobile."
        icon="loginCode"
        showBack
      >
        <Controller
          control={control}
          name="loginCode"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Login Code"
              placeholder="XXXXXXXX"
              onChangeText={(text) => onChange(text.toUpperCase())}
              onBlur={onBlur}
              value={value}
              error={errors.loginCode?.message}
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={8}
              containerStyle={styles.input}
            />
          )}
        />

        <Text style={[styles.helper, { color: colors.textSecondary }]}>Codes are case-insensitive and can include letters or numbers.</Text>

        <Button
          title="Sign In"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          fullWidth
          style={styles.button}
        />
      </AuthScreenShell>

      <Toast
        visible={showToast}
        message={toastMessage}
        type="error"
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

export default LoginCodeScreen;
