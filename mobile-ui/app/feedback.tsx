import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '@/src/hooks/use-theme';
import { useLocale } from '@/src/hooks/use-locale';
import { useAuth } from '@/src/hooks/use-auth';
import { useTabBarHeight } from '@/src/hooks/use-tab-bar-height';
import { Spacing, FontSize, BorderRadius } from '@/src/constants/theme';
import { ScreenHeader } from '@/src/components/shell';
import { SwipeBackEdge } from '@/src/components/common/SwipeBackEdge';
import { Button } from '@/src/components/common/Button';
import { Input } from '@/src/components/common/Input';
import { useToast } from '@/src/components/common/Toast';
import { sendFeedback, type FeedbackCategory } from '@/src/api/feedback';

const MIN_LENGTH = 3;

/*
 * Uygulama ici geri bildirim ve guvenlik bildirimi. Google Play Cocuk Guvenligi politikasi
 * kullanicinin uygulamadan cikmadan endise bildirebilmesini ister. Misafir de kullanir:
 * kenar cubugundan herkese acik, giris istemez.
 */
export default function FeedbackScreen() {
  const { colors } = useTheme();
  const { messages } = useLocale();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const tabBarHeight = useTabBarHeight();
  const m = messages.feedback;

  const [category, setCategory] = useState<FeedbackCategory>('child_safety');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const categories: { key: FeedbackCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'child_safety', label: m.categories.childSafety, icon: 'shield-checkmark-outline' },
    { key: 'harassment', label: m.categories.harassment, icon: 'hand-left-outline' },
    { key: 'spam', label: m.categories.spam, icon: 'mail-unread-outline' },
    { key: 'bug', label: m.categories.bug, icon: 'bug-outline' },
    { key: 'other', label: m.categories.other, icon: 'chatbubble-ellipses-outline' },
  ];

  const mutation = useMutation({
    mutationFn: () =>
      sendFeedback({
        category,
        message: message.trim(),
        contactEmail: !isAuthenticated && email.trim() ? email.trim() : undefined,
      }),
    onSuccess: () => {
      showToast('success', m.success);
      setMessage('');
      setEmail('');
      setSent(true);
    },
    onError: () => showToast('error', m.error),
  });

  const canSend = message.trim().length >= MIN_LENGTH && !mutation.isPending;

  return (
    <SwipeBackEdge>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title={m.title} />
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + Spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.introCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
              <Text style={[styles.introText, { color: colors.textSecondary }]}>{m.intro}</Text>
            </View>

            {sent ? (
              <View style={[styles.sentCard, { backgroundColor: colors.surface, borderColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={[styles.sentText, { color: colors.text }]}>{m.sentInfo}</Text>
              </View>
            ) : null}

            <Text style={[styles.label, { color: colors.text }]}>{m.categoryLabel}</Text>
            <View style={styles.chips}>
              {categories.map((c) => {
                const active = c.key === category;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : colors.surface,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons name={c.icon} size={16} color={active ? '#ffffff' : colors.textSecondary} />
                    <Text style={[styles.chipText, { color: active ? '#ffffff' : colors.text }]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label={m.messageLabel}
              placeholder={m.messagePlaceholder}
              value={message}
              onChangeText={(t) => {
                setMessage(t);
                if (sent) setSent(false);
              }}
              multiline
              numberOfLines={6}
              maxLength={2000}
              style={styles.textarea}
            />

            {!isAuthenticated ? (
              <Input
                label={m.emailLabel}
                placeholder={m.emailPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={200}
              />
            ) : null}

            <Button
              title={mutation.isPending ? m.sending : m.send}
              onPress={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={!canSend}
              fullWidth
            />

            <Text style={[styles.note, { color: colors.textMuted }]}>{m.note}</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SwipeBackEdge>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  introText: { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },
  sentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sentText: { flex: 1, fontSize: FontSize.sm },
  label: { fontSize: FontSize.sm, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: FontSize.sm, fontWeight: '500' },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  note: { fontSize: FontSize.xs, lineHeight: 18, textAlign: 'center' },
});
