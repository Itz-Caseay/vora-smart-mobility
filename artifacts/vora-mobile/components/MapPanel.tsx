import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';

type MapPanelProps = {
  destination?: string;
  progress?: number;
  compact?: boolean;
  dark?: boolean;
};

export function MapPanel({
  destination = 'Bastos',
  progress = 0,
  compact = false,
  dark = false,
}: MapPanelProps) {
  const driverLeft = 18 + Math.min(1, Math.max(0, progress)) * 58;
  const driverTop = 64 - Math.sin(Math.min(1, Math.max(0, progress)) * Math.PI) * 24;
  return (
    <View style={[styles.map, compact && styles.compactMap, dark && styles.darkMap]}>
      <View style={styles.mapGrid}>
        <View style={[styles.street, styles.streetOne]} />
        <View style={[styles.street, styles.streetTwo]} />
        <View style={[styles.street, styles.streetThree]} />
        <View style={[styles.street, styles.streetFour]} />
        <View style={[styles.street, styles.streetFive]} />
        <View style={styles.park}>
          <Ionicons name="leaf-outline" size={14} color={dark ? '#B7F34A' : '#6D9C35'} />
        </View>
      </View>
      <View style={styles.routeLine} />
      <View style={styles.routeGlow} />
      <View style={[styles.pin, styles.pickupPin]}>
        <View style={styles.pinDot} />
      </View>
      <View style={[styles.pin, styles.destinationPin]}>
        <Ionicons name="location" size={20} color={colors.light.destructive} />
      </View>
      {progress > 0 ? (
        <View style={[styles.driverPin, { left: `${driverLeft}%`, top: `${driverTop}%` }]}>
          <Ionicons name="car-sport" size={13} color={colors.light.foreground} />
        </View>
      ) : null}
      <View style={styles.mapLabel}>
        <View style={styles.liveDot} />
        <Text style={[styles.mapLabelText, dark && styles.mapLabelDark]}>GPS active</Text>
      </View>
      {!compact ? (
        <View style={styles.destinationLabel}>
          <Text style={styles.destinationText}>{destination}</Text>
        </View>
      ) : null}
      <View style={styles.zoomControl}>
        <Ionicons name="locate-outline" size={17} color={dark ? '#FFFFFF' : colors.light.foreground} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#DDE8D6',
    position: 'relative',
  },
  compactMap: {
    height: 188,
  },
  darkMap: {
    backgroundColor: '#1A2730',
  },
  mapGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.65,
  },
  street: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
    borderRadius: 12,
  },
  streetOne: {
    width: '120%',
    height: 18,
    left: '-10%',
    top: '27%',
    transform: [{ rotate: '-16deg' }],
  },
  streetTwo: {
    width: '120%',
    height: 11,
    left: '-12%',
    top: '62%',
    transform: [{ rotate: '22deg' }],
  },
  streetThree: {
    width: 13,
    height: '120%',
    left: '23%',
    top: '-10%',
    transform: [{ rotate: '16deg' }],
  },
  streetFour: {
    width: 10,
    height: '120%',
    left: '74%',
    top: '-10%',
    transform: [{ rotate: '-19deg' }],
  },
  streetFive: {
    width: '110%',
    height: 8,
    left: '-5%',
    top: '80%',
    transform: [{ rotate: '-7deg' }],
  },
  park: {
    position: 'absolute',
    right: '12%',
    top: '16%',
    width: 45,
    height: 53,
    borderRadius: 22,
    backgroundColor: '#C9DFB7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLine: {
    position: 'absolute',
    width: '62%',
    height: 6,
    left: '19%',
    top: '49%',
    borderRadius: 10,
    backgroundColor: colors.light.primary,
    transform: [{ rotate: '-14deg' }],
  },
  routeGlow: {
    position: 'absolute',
    width: '68%',
    height: 16,
    left: '16%',
    top: '47%',
    borderRadius: 10,
    backgroundColor: colors.light.primary,
    opacity: 0.2,
    transform: [{ rotate: '-14deg' }],
  },
  pin: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupPin: {
    left: '14%',
    top: '59%',
    backgroundColor: colors.light.foreground,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.light.primary,
  },
  destinationPin: {
    right: '11%',
    top: '25%',
  },
  driverPin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#10182B',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  mapLabel: {
    position: 'absolute',
    left: 14,
    top: 14,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#57AA39',
  },
  mapLabelText: {
    color: colors.light.foreground,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  mapLabelDark: {
    color: '#10182B',
  },
  destinationLabel: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: 'rgba(16,24,43,0.88)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  destinationText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  zoomControl: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});