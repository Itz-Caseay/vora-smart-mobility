import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';

type VoraLogoProps = {
  compact?: boolean;
  inverse?: boolean;
};

export function VoraLogo({ compact = false, inverse = false }: VoraLogoProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, inverse && styles.markInverse]}>
        <Ionicons name="navigate" size={compact ? 15 : 18} color={colors.light.primaryForeground} />
      </View>
      {!compact ? (
        <View>
          <Text style={[styles.wordmark, inverse && styles.wordmarkInverse]}>VORA</Text>
          <Text style={[styles.tagline, inverse && styles.taglineInverse]}>MOVE SMARTER</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  markInverse: {
    backgroundColor: colors.light.primary,
  },
  wordmark: {
    color: colors.light.foreground,
    fontFamily: 'Inter_700Bold',
    fontSize: 19,
    letterSpacing: 1.5,
    lineHeight: 21,
  },
  wordmarkInverse: {
    color: '#FFFFFF',
  },
  tagline: {
    color: colors.light.mutedForeground,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    letterSpacing: 1.3,
  },
  taglineInverse: {
    color: '#DCE2EA',
  },
});