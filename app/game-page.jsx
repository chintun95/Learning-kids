import React, { memo, useMemo, useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Animated,
  FlatList,
  ImageBackground,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import bg from '@/assets/images/app-background.png';
import Flappy from './Games/flappy';
import Snake from './SnakeGame';

// --- GAMES DATA ---
const GAMES = [
  { key: 'flappy', title: 'Flappy', image: require('@/assets/images/kiwi.png'), onPressType: 'embed', tint: '#FF6B6B' },
  { key: 'snake', title: 'Snake', image: require('@/assets/images/snake.png'), onPressType: 'embed', tint: '#4ECDC4' },
  { key: 'game3', title: 'Watermelon', image: require('@/assets/images/watermelon.png'), onPressType: 'disabled', tint: '#7FB3FF' },
  { key: 'quiz', title: 'Quiz', image: require('@/assets/images/saftey-sign.png'), onPressType: 'route', routeName: 'QuizScreen', tint: '#FFD166' },
];

// --- Game Card ---
const GameCard = memo(({ title, image, onPress, disabled, tint }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;

  const animateTo = useCallback((down) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: down ? 0.96 : 1, useNativeDriver: true }),
      Animated.timing(shadow, { toValue: down ? 1 : 0, duration: 120, useNativeDriver: false }),
    ]).start();
  }, []);

  const elevation = shadow.interpolate({ inputRange: [0, 1], outputRange: [5, 10] });
  const shadowOpacity = shadow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.2] });
  const shadowRadius = shadow.interpolate({ inputRange: [0, 1], outputRange: [8, 12] });

  const handlePress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    onPress?.();
  }, [onPress]);

  return (
    <Animated.View style={[styles.cardWrapper, { elevation, shadowColor: '#000', shadowOpacity, shadowOffset: { width: 0, height: 4 }, shadowRadius }]}>
      <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed, disabled && styles.cardDisabled]}
          onPressIn={disabled ? undefined : () => animateTo(true)}
          onPressOut={disabled ? undefined : () => animateTo(false)}
          onPress={disabled ? undefined : handlePress}
        >
          <View style={[styles.tile, { backgroundColor: tint }]} />
          <Image source={image} style={styles.icon} contentFit="contain" />
          <Text style={styles.cardTitle}>{title}</Text>
          {disabled && (
            <View style={styles.disabledOverlay}>
              <Text style={styles.disabledText}>Coming Soon!</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

// --- Header Inline ---
const HeaderInline = memo(({ onBack, title }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerInline, { paddingTop: insets.top + 6 }]}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={wp('6%')} color="#000" />
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>
      <Text style={styles.headerInlineTitle}>{title}</Text>
      <View style={{ width: 48 }} />
    </View>
  );
});

// --- Game Page ---
const GamePage = memo(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [fontsLoaded] = useFonts({ 'FredokaOne-Regular': require('@/assets/fonts/FredokaOne-Regular.ttf') });
  const [selectedGame, setSelectedGame] = useState(null);

  const handleSelect = useCallback(
    (item) => {
      Haptics.selectionAsync().catch(() => {});
      if (item.onPressType === 'embed') setSelectedGame(item.key);
      else if (item.onPressType === 'route' && item.routeName) navigation.navigate(item.routeName);
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <GameCard
        title={item.title}
        image={item.image}
        disabled={item.onPressType === 'disabled'}
        tint={item.tint}
        onPress={() => handleSelect(item)}
      />
    ),
    [handleSelect]
  );

  if (!fontsLoaded) return <SafeAreaView style={{ flex: 1 }} />;

  // Embedded games
  if (selectedGame === 'flappy') return <SafeAreaView style={{ flex: 1 }}><HeaderInline onBack={() => setSelectedGame(null)} title="Flappy" /><Flappy /></SafeAreaView>;
  if (selectedGame === 'snake') return <SafeAreaView style={{ flex: 1 }}><HeaderInline onBack={() => setSelectedGame(null)} title="Snake" /><Snake /></SafeAreaView>;

  // Game selection screen
  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={bg} resizeMode="cover" style={styles.background} />

      <View style={[styles.backContainer, { top: insets.top + hp('1%') }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={wp('6.2%')} color="#000" />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, isDark && { color: '#fff' }]}>Select a Game!</Text>
        <Text style={[styles.subtitle, isDark && { color: '#eaeaea' }]}>Pick one to start playing</Text>
      </View>

      <FlatList
        data={GAMES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
});

// --- Styles ---
const CARD_W = wp('46%');
const CARD_H = CARD_W * 1.1;
const ICON = wp('20%');

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  background: { position: 'absolute', width: wp('100%'), height: hp('100%') },
  topBar: { width: '100%', alignItems: 'center', marginBottom: hp('1%') },
  title: { fontFamily: 'FredokaOne-Regular', fontSize: wp('9%'), color: '#1E1E1E' },
  subtitle: { fontFamily: 'FredokaOne-Regular', fontSize: wp('4%'), color: '#2f2f2f', opacity: 0.9, marginTop: 2 },
  backContainer: { position: 'absolute', left: wp('4%'), zIndex: 10 },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, minWidth: 48 },
  backLabel: { marginLeft: 2, fontFamily: 'FredokaOne-Regular', fontSize: wp('4.2%'), color: '#000' },
  listContent: { paddingBottom: hp('6%'), paddingHorizontal: wp('3%'), alignItems: 'center' },
  row: { justifyContent: 'space-between', width: wp('94%'), marginBottom: hp('2.2%') },
  cardWrapper: { width: CARD_W, height: CARD_H, borderRadius: 22, backgroundColor: 'transparent' },
  card: { flex: 1, borderRadius: 22, borderWidth: 2, borderColor: '#000', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardPressed: { opacity: 0.93 },
  cardDisabled: { opacity: 0.7 },
  tile: { position: 'absolute', top: '10%', width: '88%', height: '62%', borderRadius: 18 },
  icon: { width: ICON, height: ICON, marginBottom: 8 },
  cardTitle: { fontFamily: 'FredokaOne-Regular', fontSize: wp('5%'), color: '#121212' },
  disabledOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },
  disabledText: { textAlign: 'center', fontFamily: 'FredokaOne-Regular', fontSize: wp('3.6%'), color: '#333', paddingHorizontal: 8 },
  headerInline: { width: '100%', paddingHorizontal: wp('4%'), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: hp('1.2%') },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, minWidth: 48 },
  headerInlineTitle: { fontFamily: 'FredokaOne-Regular', fontSize: wp('7.2%'), color: '#1E1E1E' },
});

export default GamePage;
