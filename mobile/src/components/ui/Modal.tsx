import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';
import { AppIcon } from '../shared/AppIcon';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = true,
}) => {
  const { colors, colorScheme } = useAppTheme();

  return (
    <RNModal
      key={colorScheme}
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <Animated.View
            entering={SlideInDown.duration(300).springify()}
            exiting={SlideOutDown.duration(200)}
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.panel,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />

            {(title || subtitle || showCloseButton) && (
              <View style={[styles.header, { borderBottomColor: colors.border }]}> 
                <View style={styles.headerCopy}>
                  {title && (
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                  )}
                  {subtitle ? (
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                  ) : null}
                </View>
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={onClose}
                    style={[styles.closeButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}
                  >
                    <AppIcon name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  overlayTouch: {
    flex: 1,
  },
  modalContent: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 720,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    borderWidth: 1,
    maxHeight: Dimensions.get('window').height * 0.9,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: -6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    flex: 1,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.base,
    paddingTop: Spacing.sm,
  },
});
