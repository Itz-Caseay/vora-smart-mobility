import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MapPanel } from '@/components/MapPanel';
import { VoraLogo } from '@/components/VoraLogo';
import colors from '@/constants/colors';

type Screen =
  | 'home'
  | 'destination'
  | 'route'
  | 'rides'
  | 'confirm'
  | 'matching'
  | 'trip'
  | 'complete'
  | 'profile';
type AuthStep = 'phone' | 'otp' | 'name';
type RideType = 'solo' | 'share' | 'accessible';
type Landmark = {
  name: string;
  area: string;
  icon: keyof typeof Ionicons.glyphMap;
  distance: string;
};
type Driver = {
  name: string;
  initials: string;
  rating: string;
  car: string;
  plate: string;
  eta: string;
  trips: string;
};

const palette = colors.light;
const landmarks: Landmark[] = [
  { name: 'Carrefour Bastos', area: 'Bastos, Yaoundé', icon: 'business-outline', distance: '8.4 km' },
  { name: 'Mokolo', area: 'Mokolo, Yaoundé', icon: 'storefront-outline', distance: '2.1 km' },
  { name: 'Etoudi', area: 'Etoudi, Yaoundé', icon: 'home-outline', distance: '6.8 km' },
  { name: 'Omnisport', area: 'Yaoundé Centre', icon: 'football-outline', distance: '4.6 km' },
  { name: 'Rond Point Nlongkak', area: 'Nlongkak, Yaoundé', icon: 'navigate-outline', distance: '5.2 km' },
  { name: 'Montée Jouvence', area: 'Jouvence, Yaoundé', icon: 'leaf-outline', distance: '9.1 km' },
];
const driverPool: Driver[] = [
  { name: 'Jean Mballa', initials: 'JM', rating: '4.9', car: 'Toyota Corolla • Silver', plate: 'CE 123 AB', eta: '4 min', trips: '1,248 trips' },
  { name: 'Brenda Ngu', initials: 'BN', rating: '4.8', car: 'Toyota Yaris • White', plate: 'CE 456 CD', eta: '6 min', trips: '986 trips' },
  { name: 'Patrick Etoa', initials: 'PE', rating: '4.9', car: 'Hyundai Elantra • Black', plate: 'CE 852 EF', eta: '5 min', trips: '1,544 trips' },
];

function formatCfa(amount: number) {
  return `${amount.toLocaleString('en-US')} FCFA`;
}

function TapButton({
  children,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  compact = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'ghost' | 'danger' | 'soft';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      testID={`button-${String(children).replace(/\s/g, '-').toLowerCase()}`}
      onPress={() => {
        if (!disabled) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'dark' && styles.buttonDark,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        variant === 'soft' && styles.buttonSoft,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
      disabled={disabled}
    >
      {icon ? <Ionicons name={icon} size={17} color={variant === 'primary' || variant === 'soft' ? palette.foreground : '#FFFFFF'} /> : null}
      <Text style={[styles.buttonText, variant === 'primary' && styles.buttonTextPrimary, variant === 'soft' && styles.buttonTextSoft]}>{children}</Text>
    </Pressable>
  );
}

function ScreenHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <View style={styles.screenHeader}>
      <Pressable testID="button-back" onPress={onBack} style={styles.iconButton}>
        <Ionicons name="chevron-back" size={22} color={palette.foreground} />
      </Pressable>
      <Text style={styles.screenTitle}>{title}</Text>
      <View style={styles.headerAction}>{action}</View>
    </View>
  );
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'green' | 'dark' | 'red' }) {
  return (
    <View style={[styles.pill, tone === 'green' && styles.pillGreen, tone === 'dark' && styles.pillDark, tone === 'red' && styles.pillRed]}>
      <Text style={[styles.pillText, tone === 'green' && styles.pillTextGreen, tone === 'dark' && styles.pillTextDark, tone === 'red' && styles.pillTextRed]}>{children}</Text>
    </View>
  );
}

function InfoRow({ icon, title, detail, right }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={palette.foreground} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoTitle}>{title}</Text>
        {detail ? <Text style={styles.infoDetail}>{detail}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function AuthScreen({
  step,
  setStep,
  phone,
  setPhone,
  otp,
  setOtp,
  name,
  setName,
  onComplete,
}: {
  step: AuthStep;
  setStep: (step: AuthStep) => void;
  phone: string;
  setPhone: (value: string) => void;
  otp: string;
  setOtp: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  onComplete: () => void;
}) {
  const insets = useSafeAreaInsets();
  const canContinue = step === 'phone' ? phone.replace(/\D/g, '').length >= 8 : step === 'otp' ? otp.length === 4 : name.trim().length > 1;
  return (
    <View style={[styles.authPage, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.authTop}>
        <VoraLogo inverse />
        <Pill tone="green">Cameroon first</Pill>
      </View>
      <View style={styles.authHero}>
        <View style={styles.authOrb}><Ionicons name="navigate" size={42} color={palette.primaryForeground} /></View>
        <Text style={styles.authKicker}>MOVE SMARTER. MOVE SAFER.</Text>
        <Text style={styles.authTitle}>Your city,{"\n"}your way.</Text>
        <Text style={styles.authSubtitle}>A better way to move around Yaoundé, built around the places and realities you know.</Text>
      </View>
      <View style={styles.authCard}>
        <Text style={styles.authCardTitle}>{step === 'phone' ? 'Sign in to VORA' : step === 'otp' ? 'Check your messages' : 'Make it yours'}</Text>
        <Text style={styles.authCardSubtitle}>{step === 'phone' ? 'We will send a one-time code to your phone.' : step === 'otp' ? `Enter the 4-digit code sent to ${phone || '+237 6•• •• ••'}.` : 'What should we call you on your trips?'}</Text>
        {step === 'phone' ? (
          <View style={styles.phoneInput}>
            <Text style={styles.countryCode}>+237</Text>
            <TextInput testID="input-phone" style={styles.inputInline} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="6 70 00 00 00" placeholderTextColor={palette.mutedForeground} />
          </View>
        ) : step === 'otp' ? (
          <TextInput testID="input-otp" style={[styles.textInput, styles.otpInput]} value={otp} onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0000" placeholderTextColor={palette.mutedForeground} maxLength={4} />
        ) : (
          <TextInput testID="input-name" style={styles.textInput} value={name} onChangeText={setName} placeholder="Your first name" placeholderTextColor={palette.mutedForeground} autoFocus />
        )}
        <TapButton
          onPress={() => {
            if (!canContinue) return;
            if (step === 'phone') setStep('otp');
            else if (step === 'otp') setStep('name');
            else onComplete();
          }}
          disabled={!canContinue}
        >
          {step === 'name' ? 'Enter VORA' : 'Continue'}
        </TapButton>
        {step === 'otp' ? <Pressable onPress={() => setStep('phone')}><Text style={styles.authLink}>Change phone number</Text></Pressable> : null}
        <Text style={styles.authFinePrint}>By continuing, you agree to VORA's Terms and Privacy Policy.</Text>
      </View>
    </View>
  );
}

function ProfileSetupScreen({
  name,
  selectedLocation,
  onSelect,
  onSave,
}: {
  name: string;
  selectedLocation: Landmark | null;
  onSelect: (location: Landmark) => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.profileSetupPage, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.profileSetupHeader}>
        <VoraLogo inverse />
        <Pill tone="green">Step 2 of 2</Pill>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileSetupScroll}>
        <View style={styles.profileSetupIcon}><Ionicons name="person" size={27} color={palette.foreground} /></View>
        <Text style={styles.profileSetupKicker}>WELCOME TO VORA, {name.toUpperCase()}</Text>
        <Text style={styles.profileSetupTitle}>Tell us where you usually start.</Text>
        <Text style={styles.profileSetupSubtitle}>Your usual location helps us make your dashboard useful from the first tap. You can change it anytime in Settings.</Text>
        <View style={styles.profileSetupCard}>
          <Text style={styles.profileSetupLabel}>YOUR USUAL LOCATION</Text>
          {landmarks.map((item) => (
            <Pressable key={item.name} testID={`usual-location-${item.name}`} onPress={() => onSelect(item)} style={[styles.usualLocationRow, selectedLocation?.name === item.name && styles.usualLocationSelected]}>
              <View style={[styles.usualLocationIcon, selectedLocation?.name === item.name && styles.usualLocationIconSelected]}><Ionicons name={item.icon} size={19} color={selectedLocation?.name === item.name ? palette.foreground : palette.mutedForeground} /></View>
              <View style={styles.usualLocationCopy}><Text style={styles.usualLocationName}>{item.name}</Text><Text style={styles.usualLocationArea}>{item.area}</Text></View>
              {selectedLocation?.name === item.name ? <Ionicons name="checkmark-circle" size={21} color="#57AA39" /> : <Ionicons name="ellipse-outline" size={20} color={palette.border} />}
            </Pressable>
          ))}
        </View>
        <TapButton onPress={onSave} disabled={!selectedLocation} icon="arrow-forward">Save profile and enter dashboard</TapButton>
        <Text style={styles.profileSetupFinePrint}>You can update your usual location from Profile settings at any time.</Text>
      </ScrollView>
    </View>
  );
}

export default function VoraHome() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('home');
  const [splash, setSplash] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [accountCreated, setAccountCreated] = useState<boolean | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('670000000');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('Audrey');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState<Landmark>(landmarks[0]);
  const [usualLocation, setUsualLocation] = useState<Landmark | null>(null);
  const [rideType, setRideType] = useState<RideType>('share');
  const [driver, setDriver] = useState<Driver>(driverPool[0]);
  const [driverSearching, setDriverSearching] = useState(true);
  const [tripProgress, setTripProgress] = useState(0);
  const [rating, setRating] = useState(0);
  const [safetyModal, setSafetyModal] = useState<'sos' | 'share' | null>(null);
  const [showFare, setShowFare] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [voiceGuidance, setVoiceGuidance] = useState(true);
  const [locationReady, setLocationReady] = useState(false);

  const filteredLandmarks = useMemo(
    () => landmarks.filter((item) => `${item.name} ${item.area}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  const fare = rideType === 'solo' ? 2500 : rideType === 'accessible' ? 2800 : 1600;
  const duration = rideType === 'share' ? 27 : rideType === 'accessible' ? 29 : 24;
  const textScale = largeText ? 1.12 : 1;
  const surface = highContrast ? '#121827' : palette.card;
  const pageBackground = highContrast ? '#090D16' : palette.background;
  const foreground = highContrast ? '#FFFFFF' : palette.foreground;

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 1100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    void AsyncStorage.multiGet(['vora_account_created', 'vora_profile_complete', 'vora_usual_location', 'vora_session_active', 'vora_large_text', 'vora_contrast', 'vora_voice', 'vora_profile_picture']).then((values) => {
      setAccountCreated(values[0][1] === 'true');
      setProfileComplete(values[1][1] === 'true');
      setUsualLocation(landmarks.find((item) => item.name === values[2][1]) ?? null);
      setLoggedIn(values[3][1] === 'true');
      setLargeText(values[4][1] === 'true');
      setHighContrast(values[5][1] === 'true');
      setVoiceGuidance(values[6][1] !== 'false');
      setProfilePicture(values[7][1] ?? null);
    });
    if (Platform.OS === 'web') {
      setLocationReady(true);
      return;
    }
    void Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') return;
      try {
        await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocationReady(true);
      } catch {
        setLocationReady(true);
      }
    });
  }, []);

  useEffect(() => {
    if (screen !== 'matching') return;
    setDriverSearching(true);
    const timer = setTimeout(() => {
      setDriver(driverPool[Math.floor(Math.random() * driverPool.length)]);
      setDriverSearching(false);
    }, 2100);
    return () => clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'trip') return;
    const timer = setInterval(() => {
      setTripProgress((current) => Math.min(1, current + 0.06));
    }, 1800);
    return () => clearInterval(timer);
  }, [screen]);

  const persistSetting = (key: string, value: boolean) => {
    void AsyncStorage.setItem(key, String(value));
  };
  const go = (next: Screen) => {
    void Haptics.selectionAsync();
    setScreen(next);
  };
  const resetBooking = () => {
    setTripProgress(0);
    setRating(0);
    setDriverSearching(true);
    go('home');
  };
  const shareTrip = () => {
    setSafetyModal('share');
  };
  const finishAccountCreation = () => {
    setAccountCreated(true);
    setProfileComplete(false);
    setLoggedIn(true);
    void AsyncStorage.multiSet([
      ['vora_account_created', 'true'],
      ['vora_session_active', 'true'],
    ]);
  };
  const saveProfile = () => {
    if (!usualLocation) return;
    setProfileComplete(true);
    void AsyncStorage.multiSet([
      ['vora_profile_complete', 'true'],
      ['vora_usual_location', usualLocation.name],
    ]);
    go('home');
  };
  const chooseProfilePicture = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setProfilePicture(result.assets[0].uri);
    await AsyncStorage.setItem('vora_profile_picture', result.assets[0].uri);
  };

  if (splash || accountCreated === null || profileComplete === null) {
    return (
      <View style={[styles.splash, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.splashMark}><Ionicons name="navigate" size={48} color={palette.primaryForeground} /></View>
        <VoraLogo inverse />
        <Text style={styles.splashCaption}>Move smarter. Move safer.</Text>
        <View style={styles.splashBottom}><View style={styles.loadingLine} /><Text style={styles.splashSmall}>Yaoundé, Cameroon</Text></View>
      </View>
    );
  }

  if (!loggedIn || !accountCreated) {
    return (
      <AuthScreen
        step={authStep}
        setStep={setAuthStep}
        phone={phone}
        setPhone={setPhone}
        otp={otp}
        setOtp={setOtp}
        name={name}
        setName={setName}
        onComplete={() => {
          setAuthStep('phone');
          finishAccountCreation();
        }}
      />
    );
  }

  if (!profileComplete) {
    return <ProfileSetupScreen name={name} selectedLocation={usualLocation} onSelect={setUsualLocation} onSave={saveProfile} />;
  }

  const renderHome = () => (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 104 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <VoraLogo />
        <Pressable testID="button-profile-home" onPress={() => go('profile')} style={styles.profileBubble}><Text style={styles.profileInitials}>AU</Text></Pressable>
      </View>
      <View style={styles.greetingBlock}>
        <Text style={[styles.eyebrow, { color: highContrast ? palette.primary : palette.mutedForeground }]}>SATURDAY, 05 SEPTEMBER</Text>
        <Text style={[styles.greeting, { color: foreground, fontSize: 29 * textScale }]}>Good morning, {name}.</Text>
        <Text style={[styles.greetingSub, { fontSize: 15 * textScale }]}>Where are you headed today?</Text>
      </View>
      <Pressable testID="button-destination-search" onPress={() => go('destination')} style={({ pressed }) => [styles.searchCard, pressed && styles.pressed]}>
        <View style={styles.searchIcon}><Ionicons name="search" size={20} color={palette.foreground} /></View>
        <View style={styles.searchCopy}><Text style={styles.searchTitle}>Where are you going?</Text><Text style={styles.searchSubtitle}>Search landmarks or places</Text></View>
        <Ionicons name="arrow-forward" size={20} color={palette.mutedForeground} />
      </Pressable>
      <View style={styles.quickRow}>
        <Pressable style={styles.quickChip} onPress={() => { setDestination(landmarks[1]); go('route'); }}><Ionicons name="storefront-outline" size={16} color={palette.foreground} /><Text style={styles.quickText}>Mokolo</Text></Pressable>
        <Pressable style={styles.quickChip} onPress={() => { setDestination(landmarks[0]); go('route'); }}><Ionicons name="business-outline" size={16} color={palette.foreground} /><Text style={styles.quickText}>Bastos</Text></Pressable>
        <Pressable style={styles.quickChip} onPress={() => go('profile')}><Ionicons name="heart-outline" size={16} color={palette.foreground} /><Text style={styles.quickText}>Saved</Text></Pressable>
      </View>
      <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: foreground, fontSize: 18 * textScale }]}>Your city at a glance</Text><Pill tone="green">{locationReady ? 'GPS active' : 'Locating'}</Pill></View>
      <MapPanel compact destination={destination.name.replace('Carrefour ', '')} />
      <View style={[styles.mapFoot, { backgroundColor: surface }]}><View style={styles.mapFootLeft}><View style={styles.locationDot} /><View><Text style={[styles.mapFootTitle, { color: foreground }]}>Current location</Text><Text style={styles.mapFootText}>Yaoundé, Centre Region</Text></View></View><Ionicons name="chevron-forward" size={17} color={palette.mutedForeground} /></View>
      <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: foreground, fontSize: 18 * textScale }]}>Recent destinations</Text><Pressable onPress={() => go('destination')}><Text style={styles.seeAll}>See all</Text></Pressable></View>
      <View style={[styles.recentCard, { backgroundColor: surface }]}>{landmarks.slice(0, 3).map((item, index) => <Pressable key={item.name} onPress={() => { setDestination(item); go('route'); }} style={[styles.recentRow, index < 2 && styles.rowDivider]}><View style={styles.recentIcon}><Ionicons name={item.icon} size={17} color={palette.foreground} /></View><View style={styles.recentCopy}><Text style={[styles.recentName, { color: foreground }]}>{item.name}</Text><Text style={styles.recentArea}>{item.area}</Text></View><Text style={styles.recentDistance}>{item.distance}</Text></Pressable>)}</View>
      <View style={styles.homeTrust}><Ionicons name="shield-checkmark" size={18} color={palette.primary} /><Text style={styles.homeTrustText}>Every VORA ride is built around your safety.</Text></View>
    </ScrollView>
  );

  const renderDestination = () => (
    <View style={[styles.page, { backgroundColor: pageBackground, paddingTop: insets.top }]}>
      <ScreenHeader title="Choose destination" onBack={() => go('home')} />
      <View style={styles.destinationBody}>
        <View style={styles.searchInputWrap}><Ionicons name="search" size={19} color={palette.mutedForeground} /><TextInput testID="input-destination" autoFocus value={query} onChangeText={setQuery} placeholder="Search a landmark or address" placeholderTextColor={palette.mutedForeground} style={styles.destinationInput} /><Pressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={18} color={query ? palette.mutedForeground : 'transparent'} /></Pressable></View>
        <View style={styles.locationRow}><View style={styles.locationIcon}><Ionicons name="navigate" size={17} color={palette.foreground} /></View><View><Text style={styles.locationTitle}>Use current location</Text><Text style={styles.locationSubtitle}>Yaoundé, Centre Region</Text></View></View>
        <View style={styles.landmarkHeading}><Text style={styles.sectionTitle}>Popular in Yaoundé</Text><Text style={styles.landmarkHint}>Landmark search</Text></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>{filteredLandmarks.length ? filteredLandmarks.map((item) => <Pressable key={item.name} testID={`destination-${item.name}`} onPress={() => { setDestination(item); go('route'); }} style={({ pressed }) => [styles.landmarkRow, pressed && styles.pressed]}><View style={styles.landmarkIcon}><Ionicons name={item.icon} size={21} color={palette.foreground} /></View><View style={styles.landmarkCopy}><Text style={styles.landmarkName}>{item.name}</Text><Text style={styles.landmarkArea}>{item.area}</Text></View><View style={styles.landmarkRight}><Text style={styles.landmarkDistance}>{item.distance}</Text><Ionicons name="chevron-forward" size={16} color={palette.mutedForeground} /></View></Pressable>) : <View style={styles.emptyState}><Ionicons name="search-outline" size={28} color={palette.mutedForeground} /><Text style={styles.emptyTitle}>No landmarks found</Text><Text style={styles.emptySubtitle}>Try Bastos, Mokolo, or Nlongkak.</Text></View>}</ScrollView>
      </View>
    </View>
  );

  const renderRoute = () => (
    <View style={[styles.page, { backgroundColor: pageBackground, paddingTop: insets.top }]}>
      <ScreenHeader title="Route preview" onBack={() => go('destination')} action={<Pressable onPress={() => setShowFare(true)}><Ionicons name="information-circle-outline" size={22} color={palette.foreground} /></Pressable>} />
      <ScrollView contentContainerStyle={[styles.routeBody, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <MapPanel destination={destination.name.replace('Carrefour ', '')} />
        <View style={styles.routeEndpoints}><View style={styles.endpointLine}><View style={styles.endpointDotStart} /><View><Text style={styles.endpointLabel}>PICKUP</Text><Text style={styles.endpointValue}>Current location</Text></View></View><View style={styles.endpointConnector} /><View style={styles.endpointLine}><Ionicons name="location" size={18} color={palette.destructive} /><View><Text style={styles.endpointLabel}>DESTINATION</Text><Text style={styles.endpointValue}>{destination.name}</Text></View></View></View>
        <View style={styles.routeMetrics}><View><Text style={styles.metricValue}>8.4 km</Text><Text style={styles.metricLabel}>Distance</Text></View><View style={styles.metricDivider} /><View><Text style={styles.metricValue}>24 min</Text><Text style={styles.metricLabel}>Estimated time</Text></View><View style={styles.metricDivider} /><View><Text style={styles.metricValue}>Low</Text><Text style={styles.metricLabel}>Traffic</Text></View></View>
        <Pressable onPress={() => Alert.alert('Alternative route', 'The practical route is 1.2 km shorter but adds 3 minutes because it avoids a busy junction.')} style={styles.altRoute}><View style={styles.altRouteIcon}><Ionicons name="git-branch-outline" size={18} color={palette.foreground} /></View><View style={{ flex: 1 }}><Text style={styles.altRouteTitle}>Practical route selected</Text><Text style={styles.altRouteDetail}>Avoids Nlongkak traffic • safer turns</Text></View><Ionicons name="chevron-forward" size={17} color={palette.mutedForeground} /></Pressable>
        <TapButton onPress={() => go('rides')} icon="arrow-forward">Choose a ride</TapButton>
      </ScrollView>
      <Modal transparent visible={showFare} animationType="slide" onRequestClose={() => setShowFare(false)}><View style={styles.modalBackdrop}><View style={[styles.fareModal, { paddingBottom: insets.bottom + 22 }]}><View style={styles.modalHandle} /><Text style={styles.modalTitle}>Transparent fare estimate</Text><Text style={styles.modalSubtitle}>Your fare is calculated from the route, not a guess.</Text><View style={styles.fareLine}><Text style={styles.fareLabel}>Base fare</Text><Text style={styles.fareValue}>500 FCFA</Text></View><View style={styles.fareLine}><Text style={styles.fareLabel}>Distance · 8.4 km × 200</Text><Text style={styles.fareValue}>1,680 FCFA</Text></View><View style={styles.fareLine}><Text style={styles.fareLabel}>Time · 24 min × 15</Text><Text style={styles.fareValue}>360 FCFA</Text></View><View style={styles.fareTotal}><Text style={styles.fareTotalLabel}>Estimated fare</Text><Text style={styles.fareTotalValue}>2,540 FCFA</Text></View><Text style={styles.fareRounded}>Rounded to the nearest 100 FCFA on Solo rides.</Text><TapButton onPress={() => setShowFare(false)} variant="dark">Got it</TapButton></View></View></Modal>
    </View>
  );

  const renderRides = () => (
    <View style={[styles.page, { backgroundColor: pageBackground, paddingTop: insets.top }]}>
      <ScreenHeader title="Select your ride" onBack={() => go('route')} />
      <ScrollView contentContainerStyle={[styles.routeBody, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.smartCard}><View style={styles.smartHeader}><View style={styles.brainIcon}><Ionicons name="sparkles" size={17} color={palette.foreground} /></View><Text style={styles.smartKicker}>VORA SMART CHOICE</Text><Pill tone="green">Recommended</Pill></View><Text style={styles.smartTitle}>Shared Ride</Text><Text style={styles.smartDescription}>Best balance of price and time for this trip.</Text><View style={styles.smartStats}><View><Text style={styles.smartStatValue}>Save 900 FCFA</Text><Text style={styles.smartStatLabel}>vs. Solo</Text></View><View><Text style={styles.smartStatValue}>+3 min</Text><Text style={styles.smartStatLabel}>travel time</Text></View><View><Text style={styles.smartStatValue}>Same route</Text><Text style={styles.smartStatLabel}>destination</Text></View></View></View>
        <Text style={styles.chooseLabel}>Choose how you move</Text>
        <Pressable testID="ride-share" onPress={() => setRideType('share')} style={[styles.rideOption, rideType === 'share' && styles.rideOptionSelected]}><View style={[styles.rideIcon, rideType === 'share' && styles.rideIconSelected]}><Ionicons name="people-outline" size={23} color={rideType === 'share' ? palette.foreground : palette.mutedForeground} /></View><View style={styles.rideCopy}><View style={styles.rideNameLine}><Text style={styles.rideName}>VORA Share</Text>{rideType === 'share' ? <Pill tone="green">Best value</Pill> : null}</View><Text style={styles.rideDescription}>Share a ride, share the savings</Text></View><View style={styles.ridePrice}><Text style={styles.rideAmount}>1,600</Text><Text style={styles.rideTime}>~27 min</Text></View></Pressable>
        <Pressable testID="ride-solo" onPress={() => setRideType('solo')} style={[styles.rideOption, rideType === 'solo' && styles.rideOptionSelected]}><View style={[styles.rideIcon, rideType === 'solo' && styles.rideIconSelected]}><Ionicons name="car-outline" size={23} color={rideType === 'solo' ? palette.foreground : palette.mutedForeground} /></View><View style={styles.rideCopy}><Text style={styles.rideName}>VORA Solo</Text><Text style={styles.rideDescription}>Your ride, all yours</Text></View><View style={styles.ridePrice}><Text style={styles.rideAmount}>2,500</Text><Text style={styles.rideTime}>~24 min</Text></View></Pressable>
        <Pressable testID="ride-accessible" onPress={() => { setRideType('accessible'); setShowAccessibility(true); }} style={[styles.rideOption, rideType === 'accessible' && styles.rideOptionSelected]}><View style={[styles.rideIcon, rideType === 'accessible' && styles.rideIconSelected]}><Ionicons name="accessibility-outline" size={23} color={rideType === 'accessible' ? palette.foreground : palette.mutedForeground} /></View><View style={styles.rideCopy}><Text style={styles.rideName}>VORA Accessible</Text><Text style={styles.rideDescription}>Extra space and assistance</Text></View><View style={styles.ridePrice}><Text style={styles.rideAmount}>2,800</Text><Text style={styles.rideTime}>~29 min</Text></View></Pressable>
        <View style={styles.safetyNote}><Ionicons name="shield-checkmark-outline" size={18} color="#5B7D29" /><Text style={styles.safetyNoteText}>All options include a verified driver and SOS support.</Text></View>
        <TapButton onPress={() => go('confirm')} icon="arrow-forward">Continue with {rideType === 'share' ? 'Share' : rideType === 'solo' ? 'Solo' : 'Accessible'}</TapButton>
      </ScrollView>
      <Modal transparent visible={showAccessibility} animationType="fade" onRequestClose={() => setShowAccessibility(false)}><View style={styles.modalBackdrop}><View style={styles.smallModal}><View style={styles.smallModalIcon}><Ionicons name="accessibility" size={25} color={palette.foreground} /></View><Text style={styles.modalTitle}>Accessibility support</Text><Text style={styles.modalSubtitle}>Your driver will know you requested extra boarding space and assistance at pickup.</Text><TapButton onPress={() => setShowAccessibility(false)}>Continue</TapButton></View></View></Modal>
    </View>
  );

  const renderConfirm = () => (
    <View style={[styles.page, { backgroundColor: pageBackground, paddingTop: insets.top }]}>
      <ScreenHeader title="Confirm booking" onBack={() => go('rides')} />
      <ScrollView contentContainerStyle={[styles.routeBody, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <MapPanel compact destination={destination.name.replace('Carrefour ', '')} />
        <View style={[styles.confirmCard, { backgroundColor: surface }]}><View style={styles.confirmTop}><View><Text style={styles.confirmEyebrow}>YOUR TRIP</Text><Text style={[styles.confirmDestination, { color: foreground }]}>{destination.name}</Text></View><Pill tone="green">{rideType === 'share' ? 'Share' : rideType === 'solo' ? 'Solo' : 'Accessible'}</Pill></View><View style={styles.confirmDivider} /><InfoRow icon="navigate-outline" title="Pickup" detail="Current location, Yaoundé" /><InfoRow icon="time-outline" title="Estimated arrival" detail={`~${duration} min`} /><InfoRow icon="cash-outline" title="Estimated fare" detail="Transparent pricing" right={<Text style={styles.confirmPrice}>{formatCfa(fare)}</Text>} /></View>
        <View style={styles.cashCard}><View style={styles.cashIcon}><Ionicons name="cash-outline" size={21} color={palette.foreground} /></View><View style={{ flex: 1 }}><Text style={styles.cashTitle}>Pay with cash</Text><Text style={styles.cashDetail}>Payment is handled after your ride.</Text></View><Ionicons name="checkmark-circle" size={22} color="#57AA39" /></View>
        <View style={styles.confirmSafety}><Ionicons name="lock-closed-outline" size={15} color={palette.mutedForeground} /><Text style={styles.confirmSafetyText}>You can cancel before the driver arrives.</Text></View>
        <TapButton onPress={() => go('matching')} icon="checkmark">Book this ride</TapButton>
      </ScrollView>
    </View>
  );

  const renderMatching = () => (
    <View style={[styles.page, { backgroundColor: pageBackground, paddingTop: insets.top }]}>
      <ScreenHeader title={driverSearching ? 'Finding your driver' : 'Driver found'} onBack={() => go('confirm')} />
      <View style={styles.matchingBody}><MapPanel dark={!driverSearching} destination={destination.name.replace('Carrefour ', '')} progress={driverSearching ? 0 : 0.18} /><View style={[styles.matchingCard, { backgroundColor: surface }]}>{driverSearching ? <><View style={styles.searchingCircle}><ActivityIndicator color={palette.foreground} size="small" /><View style={styles.searchingInner}><Ionicons name="car-outline" size={25} color={palette.foreground} /></View></View><Text style={[styles.matchingTitle, { color: foreground }]}>Finding the best driver nearby</Text><Text style={styles.matchingSubtitle}>We are checking verified VORA drivers around you.</Text><View style={styles.progressTrack}><View style={styles.progressFill} /></View></> : <><View style={styles.driverFoundHeader}><View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{driver.initials}</Text></View><View style={{ flex: 1 }}><Text style={styles.driverFoundLabel}>YOUR DRIVER</Text><Text style={[styles.driverFoundName, { color: foreground }]}>{driver.name}</Text><View style={styles.driverRating}><Ionicons name="star" size={13} color="#E6A93C" /><Text style={styles.driverRatingText}>{driver.rating} • {driver.trips}</Text></View></View><Pill tone="green">{driver.eta}</Pill></View><View style={styles.vehicleRow}><Ionicons name="car-sport-outline" size={21} color={palette.foreground} /><Text style={styles.vehicleText}>{driver.car}</Text><Text style={styles.plateText}>{driver.plate}</Text></View><TapButton onPress={() => go('trip')} icon="navigate">Track driver</TapButton></>}</View></View>
    </View>
  );

  const renderTrip = () => (
    <View style={[styles.page, { backgroundColor: pageBackground, paddingTop: insets.top }]}>
      <View style={styles.tripHeader}><Pressable onPress={() => go('home')} style={styles.iconButton}><Ionicons name="chevron-down" size={23} color={foreground} /></Pressable><View style={styles.tripHeaderCenter}><Text style={[styles.tripStatus, { color: foreground }]}>{tripProgress >= 1 ? 'Arrived' : 'On the way'}</Text><Text style={styles.tripStatusDetail}>{tripProgress >= 1 ? destination.name : `${Math.max(1, Math.ceil((1 - tripProgress) * duration))} min to destination`}</Text></View><Pressable onPress={shareTrip} style={styles.iconButton}><Ionicons name="share-social-outline" size={21} color={foreground} /></Pressable></View>
      <View style={styles.tripMapWrap}><MapPanel dark destination={destination.name.replace('Carrefour ', '')} progress={tripProgress} /></View>
      <ScrollView contentContainerStyle={[styles.tripBody, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.tripProgressRow}><Text style={styles.tripProgressLabel}>Driver is heading to you</Text><Text style={styles.tripProgressValue}>{Math.round(tripProgress * 100)}%</Text></View><View style={styles.tripProgressTrack}><View style={[styles.tripProgressFill, { width: `${Math.max(8, tripProgress * 100)}%` }]} /></View>
        <View style={[styles.driverTripCard, { backgroundColor: surface }]}><View style={styles.driverTripTop}><View style={styles.driverAvatar}><Text style={styles.driverAvatarText}>{driver.initials}</Text></View><View style={{ flex: 1 }}><Text style={styles.driverFoundLabel}>VERIFIED DRIVER</Text><Text style={[styles.driverFoundName, { color: foreground }]}>{driver.name}</Text><View style={styles.driverRating}><Ionicons name="star" size={13} color="#E6A93C" /><Text style={styles.driverRatingText}>{driver.rating} rating</Text><View style={styles.verifiedTag}><Ionicons name="checkmark" size={10} color="#39721E" /><Text style={styles.verifiedText}>Verified</Text></View></View></View><View style={styles.callButton}><Ionicons name="call-outline" size={19} color={palette.foreground} /></View></View><View style={styles.vehicleRow}><Ionicons name="car-sport-outline" size={21} color={palette.foreground} /><Text style={styles.vehicleText}>{driver.car}</Text><Text style={styles.plateText}>{driver.plate}</Text></View></View>
        <View style={styles.tripActions}><Pressable onPress={shareTrip} style={styles.tripAction}><View style={styles.tripActionIcon}><Ionicons name="share-social-outline" size={20} color={palette.foreground} /></View><Text style={styles.tripActionText}>Share trip</Text></Pressable><Pressable onPress={() => setSafetyModal('sos')} style={[styles.tripAction, styles.sosAction]}><View style={styles.sosIcon}><Ionicons name="alert-circle-outline" size={20} color={palette.destructive} /></View><Text style={[styles.tripActionText, { color: palette.destructive }]}>SOS</Text></Pressable></View>
        <View style={styles.tripSafetyLine}><Ionicons name="shield-checkmark" size={16} color={palette.primary} /><Text style={styles.tripSafetyText}>Your trip is protected by VORA Safety.</Text></View>
        <TapButton onPress={() => { setTripProgress(1); go('complete'); }} variant="dark" icon="flag-outline">{tripProgress >= 1 ? 'Complete trip' : 'Simulate arrival'}</TapButton>
      </ScrollView>
    </View>
  );

  const renderComplete = () => (
    <View style={[styles.page, { backgroundColor: pageBackground, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.completeBody, { paddingBottom: insets.bottom + 26 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.completeCheck}><Ionicons name="checkmark" size={38} color={palette.foreground} /></View><Text style={[styles.completeTitle, { color: foreground }]}>You made it.</Text><Text style={styles.completeSubtitle}>Thanks for moving with VORA today.</Text>
        <View style={[styles.tripReceipt, { backgroundColor: surface }]}><View style={styles.receiptTop}><View><Text style={styles.receiptLabel}>TRIP COMPLETE</Text><Text style={[styles.receiptDestination, { color: foreground }]}>{destination.name}</Text></View><Pill tone="green">Share ride</Pill></View><View style={styles.receiptLine} /><View style={styles.receiptStats}><View><Text style={[styles.receiptValue, { color: foreground }]}>{formatCfa(fare)}</Text><Text style={styles.receiptMeta}>Fare</Text></View><View><Text style={[styles.receiptValue, { color: foreground }]}>8.4 km</Text><Text style={styles.receiptMeta}>Distance</Text></View><View><Text style={[styles.receiptValue, { color: foreground }]}>{duration} min</Text><Text style={styles.receiptMeta}>Duration</Text></View></View></View>
        <Text style={[styles.rateTitle, { color: foreground }]}>How was your trip?</Text><Text style={styles.rateSubtitle}>Your feedback keeps VORA moving safely.</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} testID={`rating-${value}`} onPress={() => setRating(value)}><Ionicons name={value <= rating ? 'star' : 'star-outline'} size={34} color={value <= rating ? '#E6A93C' : palette.mutedForeground} /></Pressable>)}</View><Pressable onPress={() => setRating(rating === 5 ? 0 : 5)} style={[styles.safeChip, rating === 5 && styles.safeChipSelected]}><Ionicons name="thumbs-up-outline" size={17} color={rating === 5 ? '#39721E' : palette.foreground} /><Text style={styles.safeChipText}>Safe driver</Text></Pressable><TapButton disabled={rating === 0} onPress={resetBooking}>Submit rating</TapButton><Pressable onPress={resetBooking}><Text style={styles.skipText}>Skip for now</Text></Pressable>
      </ScrollView>
    </View>
  );

  const renderProfile = () => (
    <View style={[styles.page, { backgroundColor: pageBackground, paddingTop: insets.top }]}>
      <ScreenHeader title="Profile" onBack={() => go('home')} />
      <ScrollView contentContainerStyle={[styles.profileBody, { paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: palette.foreground }]}><Pressable onPress={chooseProfilePicture} style={styles.profileLargeAvatar}>{profilePicture ? <Image source={{ uri: profilePicture }} style={styles.profileImage} /> : <Text style={styles.profileLargeText}>AU</Text>}</Pressable><View style={{ flex: 1 }}><Text style={styles.profileName}>{name}</Text><Text style={styles.profilePhone}>+237 {phone.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3')}</Text><View style={styles.profileVerified}><Ionicons name="checkmark-circle" size={13} color={palette.primary} /><Text style={styles.profileVerifiedText}>Phone verified</Text></View></View><Pressable onPress={chooseProfilePicture}><Ionicons name="camera-outline" size={19} color="#FFFFFF" /></Pressable></View>
        <Text style={styles.profileSectionLabel}>YOUR VORA</Text><View style={styles.profileList}><Pressable onPress={() => { setProfileComplete(false); setUsualLocation(usualLocation ?? landmarks[1]); }}><InfoRow icon="bookmark-outline" title="Usual pickup location" detail={usualLocation ? usualLocation.name : 'Choose your usual location'} right={<Ionicons name="chevron-forward" size={17} color={palette.mutedForeground} />} /></Pressable><View style={styles.profileDivider} /><InfoRow icon="time-outline" title="Ride history" detail="2 rides this month" right={<Ionicons name="chevron-forward" size={17} color={palette.mutedForeground} />} /><View style={styles.profileDivider} /><InfoRow icon="call-outline" title="Emergency contact" detail="Mireille • +237 6•• •• ••" right={<Ionicons name="chevron-forward" size={17} color={palette.mutedForeground} />} /></View>
        <Text style={styles.profileSectionLabel}>ACCESSIBILITY</Text><View style={styles.profileList}><InfoRow icon="text-outline" title="Larger text" detail="Make trip information easier to read" right={<Switch value={largeText} onValueChange={(value) => { setLargeText(value); persistSetting('vora_large_text', value); }} trackColor={{ false: '#DCE2EA', true: '#8BBD3F' }} thumbColor="#FFFFFF" />} /><View style={styles.profileDivider} /><InfoRow icon="contrast-outline" title="High contrast" detail="Increase visibility across the app" right={<Switch value={highContrast} onValueChange={(value) => { setHighContrast(value); persistSetting('vora_contrast', value); }} trackColor={{ false: '#DCE2EA', true: '#8BBD3F' }} thumbColor="#FFFFFF" />} /><View style={styles.profileDivider} /><InfoRow icon="volume-high-outline" title="Voice guidance" detail="Hear important trip updates" right={<Switch value={voiceGuidance} onValueChange={(value) => { setVoiceGuidance(value); persistSetting('vora_voice', value); }} trackColor={{ false: '#DCE2EA', true: '#8BBD3F' }} thumbColor="#FFFFFF" />} /></View>
        <Text style={styles.profileSectionLabel}>SAFETY</Text><View style={styles.safetyProfileCard}><View style={styles.safetyProfileIcon}><Ionicons name="shield-checkmark" size={22} color={palette.foreground} /></View><View style={{ flex: 1 }}><Text style={styles.safetyProfileTitle}>VORA Safety Centre</Text><Text style={styles.safetyProfileText}>Driver verification, trip sharing and SOS support.</Text></View><Ionicons name="chevron-forward" size={17} color={palette.mutedForeground} /></View>
        <Pressable onPress={() => { setLoggedIn(false); setOtp(''); setScreen('home'); void AsyncStorage.setItem('vora_session_active', 'false'); }} style={styles.logoutButton}><Ionicons name="log-out-outline" size={18} color={palette.destructive} /><Text style={styles.logoutText}>Log out</Text></Pressable><Text style={styles.profileVersion}>VORA MVP • Yaoundé, Cameroon</Text>
      </ScrollView>
    </View>
  );

  const current = screen === 'home' ? renderHome() : screen === 'destination' ? renderDestination() : screen === 'route' ? renderRoute() : screen === 'rides' ? renderRides() : screen === 'confirm' ? renderConfirm() : screen === 'matching' ? renderMatching() : screen === 'trip' ? renderTrip() : screen === 'complete' ? renderComplete() : renderProfile();

  return (
    <View style={[styles.app, { backgroundColor: pageBackground }]}>
      {current}
      {screen === 'home' ? <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}><Pressable style={styles.bottomItem}><Ionicons name="home" size={21} color={palette.foreground} /><Text style={styles.bottomActive}>Home</Text></Pressable><Pressable onPress={() => go('destination')} style={styles.bottomItem}><Ionicons name="search-outline" size={21} color={palette.mutedForeground} /><Text style={styles.bottomLabel}>Explore</Text></Pressable><Pressable onPress={() => go('profile')} style={styles.bottomItem}><Ionicons name="person-outline" size={21} color={palette.mutedForeground} /><Text style={styles.bottomLabel}>Profile</Text></Pressable></View> : null}
      <Modal transparent visible={safetyModal !== null} animationType="slide" onRequestClose={() => setSafetyModal(null)}><View style={styles.modalBackdrop}><View style={[styles.safetyModal, { paddingBottom: insets.bottom + 20 }]}><View style={styles.modalHandle} />{safetyModal === 'sos' ? <><View style={styles.sosModalIcon}><Ionicons name="alert" size={27} color="#FFFFFF" /></View><Text style={styles.modalTitle}>Emergency assistance</Text><Text style={styles.modalSubtitle}>Your trip details are ready to share. Choose an action below.</Text><Pressable onPress={() => { setSafetyModal(null); void Linking.openURL('tel:117'); }} style={styles.emergencyAction}><Ionicons name="call" size={18} color="#FFFFFF" /><Text style={styles.emergencyText}>Call emergency contact</Text></Pressable><Pressable onPress={() => { setSafetyModal('share'); }} style={styles.shareAction}><Ionicons name="share-social" size={18} color={palette.foreground} /><Text style={styles.shareActionText}>Share live trip</Text></Pressable><Pressable onPress={() => setSafetyModal(null)} style={styles.cancelAction}><Text style={styles.cancelText}>Cancel</Text></Pressable></> : <><View style={styles.shareModalIcon}><Ionicons name="share-social" size={24} color={palette.foreground} /></View><Text style={styles.modalTitle}>Share my VORA trip</Text><Text style={styles.modalSubtitle}>Send a live trip link to someone you trust.</Text><View style={styles.sharePreview}><View style={styles.sharePreviewTop}><View style={styles.driverMiniAvatar}><Text style={styles.driverMiniText}>{driver.initials}</Text></View><View style={{ flex: 1 }}><Text style={styles.shareDriver}>{driver.name} • {driver.car.split(' • ')[0]}</Text><Text style={styles.sharePlate}>{driver.plate} • ETA: {tripProgress >= 1 ? 'Arrived' : '12 min'}</Text></View><Ionicons name="shield-checkmark" size={20} color="#57AA39" /></View><View style={styles.shareMapLine}><View style={styles.shareMapDot} /><View style={styles.shareDashed} /><Ionicons name="location" size={18} color={palette.destructive} /></View></View><TapButton onPress={() => { setSafetyModal(null); Alert.alert('Trip shared', 'Your emergency contact can now follow this trip.'); }} icon="send">Share live trip</TapButton><Pressable onPress={() => setSafetyModal(null)} style={styles.cancelAction}><Text style={styles.cancelText}>Not now</Text></Pressable></>}</View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  page: { flex: 1 },
  splash: { flex: 1, backgroundColor: palette.foreground, alignItems: 'center', justifyContent: 'center' },
  splashMark: { width: 90, height: 90, borderRadius: 30, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 22, transform: [{ rotate: '-10deg' }] },
  splashCaption: { color: '#DCE2EA', fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 16 },
  splashBottom: { position: 'absolute', bottom: 34, alignItems: 'center', gap: 11 },
  loadingLine: { width: 46, height: 3, borderRadius: 3, backgroundColor: palette.primary },
  splashSmall: { color: '#8390A4', fontFamily: 'Inter_500Medium', fontSize: 11 },
  scrollContent: { paddingHorizontal: 20 },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileBubble: { width: 39, height: 39, borderRadius: 20, backgroundColor: palette.foreground, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 12 },
  greetingBlock: { marginTop: 32, marginBottom: 20 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2, marginBottom: 8 },
  greeting: { fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  greetingSub: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', marginTop: 6 },
  searchCard: { backgroundColor: palette.primary, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  searchIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.48)', alignItems: 'center', justifyContent: 'center' },
  searchCopy: { flex: 1 },
  searchTitle: { fontFamily: 'Inter_700Bold', color: palette.foreground, fontSize: 15 },
  searchSubtitle: { fontFamily: 'Inter_400Regular', color: '#4C641D', fontSize: 12, marginTop: 3 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 13 },
  quickChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 12 },
  quickText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 27, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  seeAll: { color: palette.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  mapFoot: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginTop: -3, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapFootLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.primary, borderWidth: 2, borderColor: palette.foreground },
  mapFootTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  mapFootText: { fontFamily: 'Inter_400Regular', color: palette.mutedForeground, fontSize: 11, marginTop: 2 },
  recentCard: { borderRadius: 17, paddingHorizontal: 14 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 11 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: palette.border },
  recentIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  recentCopy: { flex: 1 },
  recentName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  recentArea: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  recentDistance: { color: palette.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 },
  homeTrust: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 20 },
  homeTrustText: { color: palette.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 70, backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: palette.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  bottomItem: { alignItems: 'center', gap: 4, minWidth: 70 },
  bottomActive: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 10 },
  bottomLabel: { color: palette.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10 },
  screenHeader: { height: 66, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 17 },
  headerAction: { width: 36, alignItems: 'flex-end' },
  destinationBody: { flex: 1, paddingHorizontal: 20 },
  searchInputWrap: { height: 52, borderRadius: 15, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  destinationInput: { flex: 1, color: palette.foreground, fontFamily: 'Inter_500Medium', fontSize: 14 },
  locationRow: { marginTop: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: palette.border },
  locationIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  locationTitle: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  locationSubtitle: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  landmarkHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 8 },
  landmarkHint: { color: palette.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 },
  landmarkRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: palette.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  landmarkIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' },
  landmarkCopy: { flex: 1 },
  landmarkName: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  landmarkArea: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  landmarkRight: { alignItems: 'flex-end', gap: 4 },
  landmarkDistance: { color: palette.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 },
  emptyState: { alignItems: 'center', marginTop: 70, gap: 7 },
  emptyTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 8 },
  emptySubtitle: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 },
  routeBody: { padding: 20, gap: 16 },
  routeEndpoints: { backgroundColor: palette.card, borderRadius: 17, padding: 15, gap: 10 },
  endpointLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  endpointDotStart: { width: 15, height: 15, borderRadius: 8, borderWidth: 4, borderColor: palette.foreground, backgroundColor: palette.primary },
  endpointConnector: { marginLeft: 7, height: 12, borderLeftWidth: 1, borderLeftColor: palette.border },
  endpointLabel: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  endpointValue: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 3 },
  routeMetrics: { backgroundColor: palette.foreground, borderRadius: 17, padding: 17, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  metricValue: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 16, textAlign: 'center' },
  metricLabel: { color: '#A9B3C2', fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', marginTop: 4 },
  metricDivider: { height: 26, width: 1, backgroundColor: '#364052' },
  altRoute: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, borderRadius: 16, padding: 13, flexDirection: 'row', gap: 10, alignItems: 'center' },
  altRouteIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  altRouteTitle: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  altRouteDetail: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  button: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18 },
  buttonCompact: { minHeight: 42, borderRadius: 13 },
  buttonPrimary: { backgroundColor: palette.primary },
  buttonDark: { backgroundColor: palette.foreground },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: palette.border },
  buttonDanger: { backgroundColor: palette.destructive },
  buttonSoft: { backgroundColor: palette.accent },
  buttonDisabled: { opacity: 0.4 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  buttonText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 14 },
  buttonTextPrimary: { color: palette.foreground },
  buttonTextSoft: { color: '#3D5C12' },
  pill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: palette.muted },
  pillGreen: { backgroundColor: palette.accent },
  pillDark: { backgroundColor: palette.foreground },
  pillRed: { backgroundColor: '#FBE1E1' },
  pillText: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.3 },
  pillTextGreen: { color: '#3D5C12' },
  pillTextDark: { color: '#FFFFFF' },
  pillTextRed: { color: palette.destructive },
  smartCard: { backgroundColor: palette.foreground, borderRadius: 20, padding: 18 },
  smartHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brainIcon: { width: 27, height: 27, borderRadius: 9, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  smartKicker: { color: '#C1CBD8', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1, flex: 1 },
  smartTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 23, marginTop: 15 },
  smartDescription: { color: '#C1CBD8', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  smartStats: { flexDirection: 'row', gap: 10, marginTop: 18, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#364052' },
  smartStatValue: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 12 },
  smartStatLabel: { color: '#8591A4', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  chooseLabel: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 3 },
  rideOption: { borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rideOptionSelected: { borderColor: palette.foreground, borderWidth: 2 },
  rideIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  rideIconSelected: { backgroundColor: palette.primary },
  rideCopy: { flex: 1 },
  rideNameLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rideName: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  rideDescription: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  ridePrice: { alignItems: 'flex-end' },
  rideAmount: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 14 },
  rideTime: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  safetyNote: { backgroundColor: palette.accent, borderRadius: 13, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  safetyNoteText: { color: '#4B661B', fontFamily: 'Inter_500Medium', fontSize: 11, flex: 1 },
  confirmCard: { borderRadius: 18, padding: 16, gap: 15 },
  confirmTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  confirmEyebrow: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  confirmDestination: { fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 6 },
  confirmDivider: { height: 1, backgroundColor: palette.border },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1 },
  infoTitle: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  infoDetail: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  confirmPrice: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  cashCard: { backgroundColor: palette.accent, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  cashIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: '#D5EDA8', alignItems: 'center', justifyContent: 'center' },
  cashTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  cashDetail: { color: '#667A39', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  confirmSafety: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  confirmSafetyText: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11 },
  matchingBody: { padding: 20, gap: 17 },
  matchingCard: { borderRadius: 19, padding: 20, alignItems: 'center' },
  searchingCircle: { width: 75, height: 75, borderRadius: 38, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  searchingInner: { position: 'absolute', width: 45, height: 45, borderRadius: 23, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  matchingTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, textAlign: 'center' },
  matchingSubtitle: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6 },
  progressTrack: { width: '100%', height: 5, borderRadius: 5, backgroundColor: palette.muted, marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', width: '68%', borderRadius: 5, backgroundColor: palette.primary },
  driverFoundHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 16 },
  driverAvatar: { width: 48, height: 48, borderRadius: 17, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  driverAvatarText: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 15 },
  driverFoundLabel: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  driverFoundName: { fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 3 },
  driverRating: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  driverRatingText: { color: palette.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 10 },
  vehicleRow: { width: '100%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.border, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  vehicleText: { flex: 1, color: palette.foreground, fontFamily: 'Inter_500Medium', fontSize: 11 },
  plateText: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 11 },
  tripHeader: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripHeaderCenter: { alignItems: 'center' },
  tripStatus: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  tripStatusDetail: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  tripMapWrap: { paddingHorizontal: 12 },
  tripBody: { padding: 20, gap: 15 },
  tripProgressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tripProgressLabel: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  tripProgressValue: { color: palette.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  tripProgressTrack: { height: 6, borderRadius: 6, backgroundColor: palette.muted, overflow: 'hidden' },
  tripProgressFill: { height: '100%', backgroundColor: palette.primary, borderRadius: 6 },
  driverTripCard: { padding: 15, borderRadius: 18 },
  driverTripTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  verifiedTag: { backgroundColor: palette.accent, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 5 },
  verifiedText: { color: '#39721E', fontFamily: 'Inter_700Bold', fontSize: 8 },
  callButton: { width: 35, height: 35, borderRadius: 12, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  tripActions: { flexDirection: 'row', gap: 10 },
  tripAction: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.card, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  sosAction: { borderColor: '#F3CACA' },
  tripActionIcon: { width: 27, height: 27, borderRadius: 9, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  sosIcon: { width: 27, height: 27, borderRadius: 9, backgroundColor: '#FBE1E1', alignItems: 'center', justifyContent: 'center' },
  tripActionText: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  tripSafetyLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tripSafetyText: { color: palette.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 11 },
  completeBody: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 42, gap: 10 },
  completeCheck: { width: 72, height: 72, borderRadius: 24, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  completeTitle: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -0.8 },
  completeSubtitle: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 },
  tripReceipt: { width: '100%', padding: 16, borderRadius: 18, marginTop: 17 },
  receiptTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  receiptLabel: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  receiptDestination: { fontFamily: 'Inter_700Bold', fontSize: 16, marginTop: 6 },
  receiptLine: { height: 1, backgroundColor: palette.border, marginVertical: 15 },
  receiptStats: { flexDirection: 'row', justifyContent: 'space-between' },
  receiptValue: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  receiptMeta: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 4 },
  rateTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, marginTop: 22 },
  rateSubtitle: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 },
  stars: { flexDirection: 'row', gap: 9, marginTop: 9 },
  safeChip: { borderWidth: 1, borderColor: palette.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  safeChipSelected: { backgroundColor: palette.accent, borderColor: '#BED985' },
  safeChipText: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  skipText: { color: palette.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 12, padding: 8 },
  profileBody: { paddingHorizontal: 20, gap: 10 },
  profileCard: { padding: 16, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 13 },
  profileLargeAvatar: { width: 55, height: 55, borderRadius: 19, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  profileImage: { width: 55, height: 55, borderRadius: 19 },
  profileLargeText: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 17 },
  profileName: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 17 },
  profilePhone: { color: '#A9B3C2', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  profileVerified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  profileVerifiedText: { color: palette.primary, fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  profileSectionLabel: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1, marginTop: 12, marginBottom: 3 },
  profileList: { backgroundColor: palette.card, borderRadius: 17, padding: 14, gap: 12 },
  profileDivider: { height: 1, backgroundColor: palette.border },
  safetyProfileCard: { backgroundColor: palette.accent, padding: 14, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 10 },
  safetyProfileIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#D5EDA8', alignItems: 'center', justifyContent: 'center' },
  safetyProfileTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 12 },
  safetyProfileText: { color: '#667A39', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  logoutButton: { borderWidth: 1, borderColor: '#F3CACA', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 10 },
  logoutText: { color: palette.destructive, fontFamily: 'Inter_700Bold', fontSize: 12 },
  profileVersion: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', marginTop: 4 },
  authPage: { flex: 1, backgroundColor: palette.foreground, paddingHorizontal: 22 },
  authTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  authHero: { flex: 1, justifyContent: 'center', paddingBottom: 25 },
  authOrb: { width: 75, height: 75, borderRadius: 26, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }], marginBottom: 32 },
  authKicker: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3, marginBottom: 10 },
  authTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 42, lineHeight: 44, letterSpacing: -1.4 },
  authSubtitle: { color: '#A9B3C2', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 15, maxWidth: 310 },
  authCard: { backgroundColor: '#FFFFFF', borderRadius: 23, padding: 19, gap: 12 },
  authCardTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 19 },
  authCardSubtitle: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  phoneInput: { height: 52, borderWidth: 1, borderColor: palette.border, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  countryCode: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 14, paddingRight: 11, borderRightWidth: 1, borderRightColor: palette.border },
  inputInline: { flex: 1, color: palette.foreground, fontFamily: 'Inter_500Medium', fontSize: 15, paddingLeft: 12 },
  textInput: { height: 52, borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: 14, color: palette.foreground, fontFamily: 'Inter_500Medium', fontSize: 15 },
  otpInput: { textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 24, letterSpacing: 8 },
  authLink: { color: '#5B7D29', fontFamily: 'Inter_600SemiBold', fontSize: 11, textAlign: 'center', padding: 3 },
  authFinePrint: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 9, textAlign: 'center', lineHeight: 14 },
  profileSetupPage: { flex: 1, backgroundColor: palette.foreground, paddingHorizontal: 22 },
  profileSetupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileSetupScroll: { paddingTop: 38, paddingBottom: 10 },
  profileSetupIcon: { width: 55, height: 55, borderRadius: 18, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  profileSetupKicker: { color: palette.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1, marginBottom: 10 },
  profileSetupTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 35, letterSpacing: -0.7 },
  profileSetupSubtitle: { color: '#A9B3C2', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 12, marginBottom: 22 },
  profileSetupCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, marginBottom: 15 },
  profileSetupLabel: { color: palette.mutedForeground, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1, marginBottom: 3 },
  usualLocationRow: { minHeight: 61, borderBottomWidth: 1, borderBottomColor: palette.border, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  usualLocationSelected: { backgroundColor: '#F3F9E5', borderRadius: 12, borderBottomColor: 'transparent', paddingHorizontal: 7 },
  usualLocationIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.muted, alignItems: 'center', justifyContent: 'center' },
  usualLocationIconSelected: { backgroundColor: palette.primary },
  usualLocationCopy: { flex: 1 },
  usualLocationName: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  usualLocationArea: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  profileSetupFinePrint: { color: '#8490A3', fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', lineHeight: 15, marginTop: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16,24,43,0.55)', justifyContent: 'flex-end' },
  fareModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 21, gap: 14 },
  safetyModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 21, gap: 13 },
  smallModal: { backgroundColor: '#FFFFFF', margin: 22, borderRadius: 24, padding: 22, gap: 14 },
  modalHandle: { width: 37, height: 4, borderRadius: 4, backgroundColor: palette.border, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 20 },
  modalSubtitle: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  fareLine: { flexDirection: 'row', justifyContent: 'space-between' },
  fareLabel: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 },
  fareValue: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  fareTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 14 },
  fareTotalLabel: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 14 },
  fareTotalValue: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 15 },
  fareRounded: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: -5 },
  smallModalIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  sosModalIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: palette.destructive, alignItems: 'center', justifyContent: 'center' },
  shareModalIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  emergencyAction: { backgroundColor: palette.destructive, borderRadius: 15, minHeight: 51, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  emergencyText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 13 },
  shareAction: { backgroundColor: palette.accent, borderRadius: 15, minHeight: 51, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  shareActionText: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 13 },
  cancelAction: { alignItems: 'center', padding: 7 },
  cancelText: { color: palette.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  sharePreview: { backgroundColor: '#F5F7FA', borderRadius: 16, padding: 14 },
  sharePreviewTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  driverMiniAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  driverMiniText: { color: palette.foreground, fontFamily: 'Inter_700Bold', fontSize: 11 },
  shareDriver: { color: palette.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  sharePlate: { color: palette.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  shareMapLine: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingHorizontal: 7, gap: 9 },
  shareMapDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: palette.primary, borderWidth: 3, borderColor: palette.foreground },
  shareDashed: { flex: 1, borderTopWidth: 2, borderColor: palette.primary, borderStyle: 'dashed' },
});