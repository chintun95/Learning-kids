// file: app/Games/flappy.js
/* Flappy Bird Clone — enhanced UX (pause, combos, shield revive, power-ups UI, sounds, parallax) */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GameEngine } from 'react-native-game-engine';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import getGameEntities from '../../entities/games-index';
import Physics from '../../entities/flappy/physics';
import { fetchQuestions, Question } from '../../backend/fetchquestions';
import { supabase } from '../../backend/supabase';
import { getAuth } from 'firebase/auth';

// --- assets (images + optional sounds) ---
const BG_FAR = require('@/assets/images/fb-game-background.png');
const BG_MID = require('@/assets/images/fb-game-background.png');
const BG_NEAR = require('@/assets/images/fb-game-background.png');

// Optional: replace with your own audio files if available
const SND_POINT = null;     // e.g., require('@/assets/sounds/point.wav')
const SND_GAMEOVER = null;  // e.g., require('@/assets/sounds/hit.wav')
const SND_POWER = null;     // e.g., require('@/assets/sounds/power.wav')

const POWERUP_DURATION_MS = 10000;
const COMBO_WINDOW_MS = 2000;

export default function StartFlappyGame() {
  // ---- core game state ----
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [currentPoints, setCurrentPoints] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [difficulty, setDifficulty] = useState(1);

  // ---- question system states ----
  const [allQuestions, setAllQuestions] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isQuestionVisible, setIsQuestionVisible] = useState(false);
  const [questionsAnsweredCount, setQuestionsAnsweredCount] = useState(0);
  const [questionsToComplete, setQuestionsToComplete] = useState(5);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  // ---- power-ups & combo ----
  const [powerUp, setPowerUp] = useState(null); // 'double' | 'shield' | null
  const [powerUpEndsAt, setPowerUpEndsAt] = useState(null);
  const [combo, setCombo] = useState(1);
  const lastPointAtRef = useRef(0);

  // ---- visuals ----
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const comboAnim = useRef(new Animated.Value(0)).current;
  const bgFar = useRef(new Animated.Value(0)).current;
  const bgMid = useRef(new Animated.Value(0)).current;
  const bgNear = useRef(new Animated.Value(0)).current;
  const loopsRef = useRef([]);

  // ---- tick to refresh UI (power-up bar) ----
  const [tick, setTick] = useState(0);

  // ---- engine/sound refs ----
  const gameEngine = useRef(null);
  const sounds = useRef({ point: undefined, over: undefined, power: undefined });

  // ---- derived / memo ----
  const powerUpProgress = useMemo(() => {
    if (!powerUp || !powerUpEndsAt) return 0;
    const now = Date.now();
    const remaining = Math.max(0, powerUpEndsAt - now);
    return 1 - remaining / POWERUP_DURATION_MS;
  }, [powerUp, powerUpEndsAt, tick]);

  // ---- parallax ----
  const startParallax = useCallback(() => {
    // stop previous
    loopsRef.current.forEach((l) => l.stop && l.stop());
    loopsRef.current = [];

    const mkLoop = (val, duration) => {
      val.setValue(0);
      const loop = Animated.loop(
        Animated.timing(val, { toValue: 1, duration, useNativeDriver: true })
      );
      loop.start();
      loopsRef.current.push(loop);
    };

    mkLoop(bgFar, 24000 / Math.max(1, difficulty));
    mkLoop(bgMid, 16000 / Math.max(1, difficulty));
    mkLoop(bgNear, 9000 / Math.max(1, difficulty));
  }, [bgFar, bgMid, bgNear, difficulty]);

  const stopParallax = useCallback(() => {
    loopsRef.current.forEach((l) => l.stop && l.stop());
    loopsRef.current = [];
  }, []);

  // Load questions and settings
  useEffect(() => {
    const loadInitialData = async () => {
      if (!uid) {
        alert("User not logged in.");
        return;
      }
      setIsLoadingData(true);
      try {
        // Fetch question limit from settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('settings')
          .select('question_limit')
          .eq('user_id', uid)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
        const limit = settingsData?.question_limit || 5;
        setQuestionsToComplete(limit);

        // Fetch questions
        let fetchedQuestions = await fetchQuestions(uid);
        fetchedQuestions = fetchedQuestions.filter(q => 
          q.question_type !== 'typed_answer' && q.options
        );

        if (!fetchedQuestions || fetchedQuestions.length === 0) {
          alert("No suitable questions available. Ask your parent to add some Multiple Choice or True/False questions!");
          setIsLoadingData(false);
          return;
        }
        
        setAllQuestions(fetchedQuestions);
        setAvailableQuestions([...fetchedQuestions].sort(() => 0.5 - Math.random()));

      } catch (e) {
        console.error('Error loading questions:', e);
        alert("Could not load game data. Please try again.");
      } finally {
        setIsLoadingData(false);
      }
    };

    loadInitialData();
  }, [uid]);

  // restart parallax when difficulty changes during a run
  useEffect(() => {
    if (running && !paused) startParallax();
  }, [difficulty, running, paused, startParallax]);

  // ---- sounds (best-effort) ----
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (SND_POINT) {
          const { sound } = await Audio.Sound.createAsync(SND_POINT);
          if (mounted) sounds.current.point = sound;
        }
        if (SND_GAMEOVER) {
          const { sound } = await Audio.Sound.createAsync(SND_GAMEOVER);
          if (mounted) sounds.current.over = sound;
        }
        if (SND_POWER) {
          const { sound } = await Audio.Sound.createAsync(SND_POWER);
          if (mounted) sounds.current.power = sound;
        }
      } catch {}
    })();
    return () => {
      mounted = false;
      stopParallax();
      Object.values(sounds.current).forEach((s) => s && s.unloadAsync && s.unloadAsync());
    };
  }, [stopParallax]);

  // ---- boot: load high score + start parallax idle ----
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const mod = await import('@react-native-async-storage/async-storage');
        const v = await mod.default.getItem('@flappy_high_score');
        if (!canceled && v) setHighScore(Number(v) || 0);
      } catch {}
    })();
    startParallax();
    return () => {
      canceled = true;
    };
  }, [startParallax]);

  // ---- helpers ----
  const safeHaptic = (fn) => (typeof fn === 'function' ? fn().catch(() => {}) : undefined);
  const play = async (kind) => {
    try {
      await sounds.current[kind]?.replayAsync?.();
    } catch {}
  };
  const persistHighScore = async (score) => {
    try {
      const mod = await import('@react-native-async-storage/async-storage');
      await mod.default.setItem('@flappy_high_score', String(score));
    } catch {}
  };

  const activatePowerUp = useCallback((kind) => {
    setPowerUp(kind); // 'double' | 'shield'
    setPowerUpEndsAt(Date.now() + POWERUP_DURATION_MS);
    play('power');
    safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  }, []);

  const clearPowerUp = useCallback(() => {
    setPowerUp(null);
    setPowerUpEndsAt(null);
  }, []);

  const spawnPowerUp = useCallback(() => {
    if (powerUp) return;
    activatePowerUp('double');
  }, [powerUp, activatePowerUp]);

  // ---- overlays ----
  const [showStart, setShowStart] = useState(true);
  const [showPaused, setShowPaused] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [lastRunStats, setLastRunStats] = useState({ score: 0, maxCombo: 1, difficulty: 1 });
  const [maxCombo, setMaxCombo] = useState(1);

  // ---- score pop + combo toast ----
  const bumpScoreAnim = () => {
    scoreAnim.setValue(1.2);
    Animated.spring(scoreAnim, { toValue: 1, useNativeDriver: true }).start();
  };
  const showComboToast = () => {
    comboAnim.setValue(0);
    Animated.timing(comboAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start(() => {
      Animated.timing(comboAnim, { toValue: 0, duration: 300, delay: 300, useNativeDriver: true }).start();
    });
  };

  // ---- start/pause/restart ----
  const handleStartGame = useCallback(() => {
    setCurrentPoints(0);
    setDifficulty(1);
    setCombo(1);
    setMaxCombo(1);
    clearPowerUp();
    setPaused(false);
    setRunning(true);
    setShowStart(false);
    setShowGameOver(false);
    setShowPaused(false);

    // ---- reset questions ----
    setQuestionsAnsweredCount(0);
    setAvailableQuestions([...allQuestions].sort(() => 0.5 - Math.random()));
    setIsQuestionVisible(false);
    setCurrentQuestion(null);

    gameEngine.current?.swap(getGameEntities('flappy', 1));
    startParallax();
    safeHaptic(Haptics.selectionAsync);
  }, [clearPowerUp, startParallax, isLoadingData, allQuestions]);

  const handlePauseResume = useCallback(() => {
    if (!running) return;
    if (paused) {
      setPaused(false);
      setShowPaused(false);
      setRunning(true);
      startParallax();
      safeHaptic(Haptics.selectionAsync);
    } else {
      setPaused(true);
      setShowPaused(true);
      setRunning(false);
      stopParallax();
      safeHaptic(Haptics.selectionAsync);
    }
  }, [running, paused, startParallax, stopParallax]);

  // ---- events from Physics/system ----
  const handleGameEvent = useCallback(
    (e) => {
      if (e.type === 'new_point') {
          const now = Date.now();
          const withinCombo = now - (lastPointAtRef.current || 0) <= COMBO_WINDOW_MS;
          const newCombo = withinCombo ? combo + 1 : 1;
          lastPointAtRef.current = now;
          setCombo(newCombo);
          setMaxCombo((m) => Math.max(m, newCombo));
          if (newCombo >= 3) showComboToast();

          const base = 1 + (powerUp === 'double' ? 1 : 0);
          const bonus = Math.max(0, newCombo - 1);
          const delta = base + bonus;

          setCurrentPoints((p) => {
            const next = p + delta;
            if (next % 5 === 0) setDifficulty((d) => d + 1);
            //if (next % 7 === 0) spawnPowerUp();
          
          // NEW: Trigger question after scoring
          if (next % 3 === 0 && next > 0) {
            if (questionsAnsweredCount < questionsToComplete && availableQuestions.length > 0) {
              const randomIndex = Math.floor(Math.random() * availableQuestions.length);
              const questionToAsk = availableQuestions[randomIndex];

              setCurrentQuestion(questionToAsk);
              setAvailableQuestions(prev => prev.filter((q, index) => index !== randomIndex));

              setIsQuestionVisible(true);
              setRunning(false);  // Pause the game
              setPaused(true);
              stopParallax();
            } else if (questionsAnsweredCount >= questionsToComplete) {
              // All questions answered - game complete
              setRunning(false);
              setPaused(false);
              setShowGameOver(true);
              stopParallax();
              setLastRunStats({ score: currentPoints, maxCombo, difficulty });
              play('over');
              safeHaptic(() =>
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
              );
            }
          }

          return next;
        });

          play('point');
          bumpScoreAnim();
          safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
        }

      if (e.type === 'game_over') {
        setRunning(false);
        setPaused(false);
        setShowGameOver(true);
        stopParallax();
        setLastRunStats({ score: currentPoints, maxCombo, difficulty });
        play('over');
        safeHaptic(() =>
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        );

        setHighScore((hs) => {
          if (currentPoints > hs) {
            persistHighScore(currentPoints);
            return currentPoints;
          }
          return hs;
        });
      }
    },
    [powerUp, difficulty, currentPoints, maxCombo, clearPowerUp, startParallax, stopParallax, spawnPowerUp]
  );

  const answerQuestion = async (isCorrect, selectedOptionKey) => {
    setIsQuestionVisible(false);

    // Log answer to database
    if (uid && currentQuestion) {
      supabase.from('answer_log').insert({
        user_id: uid,
        question_id: currentQuestion.id,
        is_correct: isCorrect,
        game_name: 'Flappy Bird'
      }).then(({ error }) => {
        if (error) {
          console.error('Error logging answer:', error.message);
        }
      });
    }

    const newAnsweredCount = questionsAnsweredCount + 1;
    setQuestionsAnsweredCount(newAnsweredCount);

    if (newAnsweredCount >= questionsToComplete) {
      // All questions complete - end game
      setRunning(false);
      setShowGameOver(true);
      stopParallax();
      setLastRunStats({ score: currentPoints, maxCombo, difficulty });
    } else {
      // Resume game
      setRunning(true);
      setPaused(false);
      startParallax();
    }

    setCurrentQuestion(null);
  };

  // ---- power-up expiry ticking (UI + expiry) ----
  useEffect(() => {
    if (!powerUp || !powerUpEndsAt || !running || paused) return;
    const id = setInterval(() => {
      setTick((t) => t + 1); // refresh progress bar
      if (Date.now() >= powerUpEndsAt) {
        clearPowerUp();
      }
    }, 150);
    return () => clearInterval(id);
  }, [powerUp, powerUpEndsAt, running, paused, clearPowerUp]);

  // ---- background transforms ----
  const txFar = bgFar.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const txMid = bgMid.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
  const txNear = bgNear.interpolate({ inputRange: [0, 1], outputRange: [0, -140] });

  if (isLoadingData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading Game...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Parallax */}
      <Animated.Image source={BG_FAR} resizeMode="repeat" style={[styles.bg, { transform: [{ translateX: txFar }], opacity: 0.35, zIndex: -3 }]} />
      <Animated.Image source={BG_MID} resizeMode="repeat" style={[styles.bg, { transform: [{ translateX: txMid }], opacity: 0.55, zIndex: -2 }]} />
      <Animated.Image source={BG_NEAR} resizeMode="repeat" style={[styles.bg, { transform: [{ translateX: txNear }], opacity: 0.8, zIndex: -1 }]} />

      {/* HUD */}
      <View pointerEvents="box-none" style={styles.hud}>
        <Animated.Text style={[styles.score, { transform: [{ scale: scoreAnim }] }]}>
          {currentPoints}
        </Animated.Text>

        <View style={styles.hudRow}>
          <Text style={[styles.hudPill, { marginHorizontal: 4 }]}>HS {highScore}</Text>
          <Text style={[styles.hudPill, { marginHorizontal: 4 }]}>LV {difficulty}</Text>
          <Text style={[styles.hudPill, { marginHorizontal: 4 }]}>Q: {questionsAnsweredCount}/{questionsToComplete}</Text>

          {powerUp && (
            <View style={[styles.powerPill, { marginHorizontal: 4 }]}>
              <Text style={[styles.powerLabel, { marginRight: 8 }]}>x2</Text>
              <View style={styles.powerBar}>
                <View style={[styles.powerBarFill, { width: `${Math.min(100, Math.max(0, powerUpProgress * 100))}%` }]} />
              </View>
            </View>
          )}

          {running && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Pause"
              onPress={handlePauseResume}
              style={[styles.pauseBtn, { marginHorizontal: 4 }]}
            >
              <Text style={styles.pauseTxt}>II</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Combo toast */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.comboToast,
            {
              opacity: comboAnim,
              transform: [
                { translateY: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                { scale: comboAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
              ],
            },
          ]}
        >
          <Text style={styles.comboText}>Combo x{combo}</Text>
        </Animated.View>
      </View>

      {/* Engine */}
      <GameEngine
        ref={(r) => (gameEngine.current = r)}
        systems={[Physics]}
        entities={getGameEntities('flappy', Math.max(1, difficulty))}
        running={running}
        onEvent={handleGameEvent}
        style={styles.engine}
      />

      {/* Overlays */}
      {showStart && !running && !paused && !showGameOver && (
        <View style={styles.centerOverlay}>
          <Text style={styles.title}>FLAPPY BIRD</Text>
          <Text style={[styles.sub, { marginTop: 6 }]}>Tap to flap • Avoid pipes</Text>
          <Text style={[styles.sub, { marginTop: 2 }]}>Combos add bonus points</Text>
          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 10 }]} onPress={handleStartGame}>
            <Text style={styles.primaryBtnTxt}>START</Text>
          </TouchableOpacity>
        </View>
      )}

      {showPaused && !running && (
        <View style={styles.centerOverlay}>
          <Text style={styles.title}>Paused</Text>
          <View style={[styles.rowBtns, { marginTop: 8 }]}>
            <TouchableOpacity style={[styles.secondaryBtn, { marginHorizontal: 6 }]} onPress={handlePauseResume}>
              <Text style={styles.secondaryBtnTxt}>RESUME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginHorizontal: 6 }]}
              onPress={() => {
                setShowPaused(false);
                handleStartGame();
              }}
            >
              <Text style={styles.secondaryBtnTxt}>RESTART</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showGameOver && !running && (
        <View style={styles.centerOverlay}>
          <Text style={styles.title}>Game Over</Text>
          <Text style={[styles.stat, { marginTop: 8 }]}>Score: {lastRunStats.score}</Text>
          <Text style={[styles.stat, { marginTop: 2 }]}>Max Combo: x{lastRunStats.maxCombo}</Text>
          <Text style={[styles.stat, { marginTop: 2 }]}>Level Reached: {lastRunStats.difficulty}</Text>
          {lastRunStats.score >= highScore && highScore > 0 && (
            <Text style={[styles.newHigh, { marginTop: 6 }]}>New High Score!</Text>
          )}
          <View style={[styles.rowBtns, { marginTop: 10 }]}>
            <TouchableOpacity style={[styles.secondaryBtn, { marginHorizontal: 6 }]} onPress={handleStartGame}>
              <Text style={styles.secondaryBtnTxt}>PLAY AGAIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Question Modal */}
        {isQuestionVisible && currentQuestion && (
          <View style={styles.questionContainer}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            {currentQuestion.options && typeof currentQuestion.options === 'object' &&
              Object.entries(currentQuestion.options).map(([key, option]) => (
                <TouchableOpacity
                  key={key}
                  style={styles.questionButton}
                  onPress={() => answerQuestion(key === currentQuestion.correct_answer, key)}
                >
                  <Text style={styles.questionButtonText}>{String(option)}</Text>
                </TouchableOpacity>
              ))
            }
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#87CEFA' },
  engine: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },

  // parallax bg
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '200%', // allows scrolling
    height: '100%',
  },

  // HUD
  hud: {
    position: 'absolute',
    top: Platform.select({ ios: 56, android: 36 }),
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  score: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1.2,
  },
  hudRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudPill: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '700',
  },

  // power-up chip
  powerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffd84d',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  powerLabel: { fontWeight: '800', color: '#000' },
  powerBar: {
    height: 6,
    width: 60,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  powerBarFill: {
    height: '100%',
    backgroundColor: '#00c853',
  },

  pauseBtn: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pauseTxt: { color: '#fff', fontWeight: '800' },

  // combo toast
  comboToast: {
    position: 'absolute',
    top: 4,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  comboText: { color: '#ffd84d', fontWeight: '800' },

  // overlays
  centerOverlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  sub: { color: '#fff', opacity: 0.9, fontWeight: '600' },
  stat: { color: '#fff', fontWeight: '700' },
  newHigh: { color: '#00e676', fontWeight: '900' },

  rowBtns: { flexDirection: 'row' },

  primaryBtn: {
    backgroundColor: '#222',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#000',
  },
  primaryBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 20 },

  secondaryBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
  },
  secondaryBtnTxt: { color: '#000', fontWeight: '900' },

  // ---- quiz questions ----
  questionContainer: {
    position: 'absolute',
    top: '25%',
    left: '5%',
    right: '5%',
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#000',
  },
  questionButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  questionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
