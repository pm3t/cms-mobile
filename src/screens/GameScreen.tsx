import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { client, SERVER_BASE_URL } from '../api/client';

const { width } = Dimensions.get('window');

interface GameScreenProps {
  onClose: () => void;
}

export default function GameScreen({ onClose }: GameScreenProps) {
  const [activeTab, setActiveTab] = useState<'PLAY' | 'LEADERBOARD'>('PLAY');
  const [loading, setLoading] = useState(true);

  // Profile Stats
  const [profile, setProfile] = useState<any>({
    totalPoints: 0,
    currentStreak: 0,
    maxStreak: 0,
    rank: '-',
  });

  // Questions & Play State
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Gameplay Inputs
  const [quizSelected, setQuizSelected] = useState<string | null>(null); // For QUIZ
  const [scrambleSelectedIndices, setScrambleSelectedIndices] = useState<number[]>([]); // For SCRAMBLE (track index to support duplicate words)
  const [wordSearchSelected, setWordSearchSelected] = useState<string[]>([]); // For WORD_SEARCH
  const [guessInput, setGuessInput] = useState(''); // For GUESS
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<{
    submitted: boolean;
    isCorrect: boolean;
    correctAnswer: string;
    passageReference?: string;
    pointsEarned: number;
  } | null>(null);

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Fetch initial profile and today's questions
  const loadGameData = async () => {
    try {
      setLoading(true);
      const [profileRes, questionsRes] = await Promise.all([
        client.get('/game/profile'),
        client.get('/game/today'),
      ]);
      setProfile(profileRes.data);
      setQuestions(questionsRes.data);

      // Find first unattempted question
      const firstUnattempted = questionsRes.data.findIndex((q: any) => !q.isAttempted);
      setCurrentIdx(firstUnattempted !== -1 ? firstUnattempted : 0);

      // Reset feedback if the first question is already attempted
      if (firstUnattempted === -1 && questionsRes.data.length > 0) {
        const firstQ = questionsRes.data[0];
        setFeedback({
          submitted: true,
          isCorrect: firstQ.isCorrect,
          correctAnswer: firstQ.correctAnswer,
          passageReference: firstQ.passageReference,
          pointsEarned: firstQ.isCorrect ? firstQ.points : 0,
        });
      } else {
        setFeedback(null);
      }
    } catch (err: any) {
      console.log('Error loading game data:', err);
      Alert.alert('Error', 'Gagal memuat data game');
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const res = await client.get('/game/leaderboard');
      setLeaderboard(res.data);
    } catch (err) {
      console.log('Error loading leaderboard:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    loadGameData();
  }, []);

  useEffect(() => {
    if (activeTab === 'LEADERBOARD') {
      loadLeaderboard();
    }
  }, [activeTab]);

  // Reset inputs when active question index changes
  useEffect(() => {
    if (questions.length > 0 && questions[currentIdx]) {
      const activeQ = questions[currentIdx];
      setShowHint(false);

      if (activeQ.isAttempted) {
        setFeedback({
          submitted: true,
          isCorrect: activeQ.isCorrect,
          correctAnswer: activeQ.correctAnswer,
          passageReference: activeQ.passageReference,
          pointsEarned: activeQ.isCorrect ? activeQ.points : 0,
        });
      } else {
        setFeedback(null);
        setQuizSelected(null);
        setScrambleSelectedIndices([]);
        setWordSearchSelected([]);
        setGuessInput('');
      }
    }
  }, [currentIdx, questions]);

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (questions.length === 0) return;
    const activeQ = questions[currentIdx];

    let answer = '';
    if (activeQ.type === 'QUIZ') {
      if (!quizSelected) return Alert.alert('Peringatan', 'Silakan pilih salah satu jawaban');
      answer = quizSelected;
    } else if (activeQ.type === 'SCRAMBLE') {
      if (scrambleSelectedIndices.length === 0) return Alert.alert('Peringatan', 'Silakan susun kata terlebih dahulu');
      const opts = parseOptions(activeQ.options);
      answer = scrambleSelectedIndices.map((idx) => opts[idx]).join(' ');
    } else if (activeQ.type === 'WORD_SEARCH') {
      if (wordSearchSelected.length === 0) return Alert.alert('Peringatan', 'Silakan pilih kata-kata buah Roh/murid');
      answer = wordSearchSelected.join(', ');
    } else if (activeQ.type === 'GUESS') {
      if (!guessInput.trim()) return Alert.alert('Peringatan', 'Silakan ketik tebakan Anda');
      answer = guessInput.trim();
    }

    try {
      setSubmitting(true);
      const res = await client.post('/game/submit', {
        questionId: activeQ.id,
        answer,
      });

      const { isCorrect, pointsEarned, correctAnswer, passageReference, totalPoints, currentStreak } = res.data;

      // Update local profile stats
      setProfile((prev: any) => ({
        ...prev,
        totalPoints,
        currentStreak,
        maxStreak: Math.max(prev.maxStreak, currentStreak),
      }));

      // Update question list local state to show it is now attempted
      const updatedQuestions = [...questions];
      updatedQuestions[currentIdx] = {
        ...activeQ,
        isAttempted: true,
        isCorrect,
        correctAnswer,
      };
      setQuestions(updatedQuestions);

      setFeedback({
        submitted: true,
        isCorrect,
        correctAnswer,
        passageReference,
        pointsEarned,
      });
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.error || err.message || 'Gagal mengirimkan jawaban');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
    }
  };

  // Safe options parser
  const parseOptions = (options: any): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options;
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return options.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  };

  // Render question inputs based on type
  const renderQuestionPlay = (q: any) => {
    const opts = parseOptions(q.options);

    if (feedback?.submitted) {
      // Feedback UI
      return (
        <View style={styles.feedbackContainer}>
          <View style={[styles.feedbackBadge, feedback.isCorrect ? styles.badgeSuccess : styles.badgeFail]}>
            <Ionicons
              name={feedback.isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={feedback.isCorrect ? '#10b981' : '#ef4444'}
            />
            <Text style={[styles.feedbackBadgeText, feedback.isCorrect ? styles.textSuccess : styles.textFail]}>
              {feedback.isCorrect ? 'JAWABAN BENAR!' : 'JAWABAN SALAH'}
            </Text>
            <Text style={styles.feedbackPoints}>
              {feedback.isCorrect ? `+${feedback.pointsEarned} Poin` : '+0 Poin'}
            </Text>
          </View>

          <View style={styles.correctAnswerBox}>
            <Text style={styles.correctAnswerLabel}>Jawaban Benar:</Text>
            <Text style={styles.correctAnswerText}>{feedback.correctAnswer}</Text>
            {feedback.passageReference && (
              <Text style={styles.passageRef}>📍 Referensi: {feedback.passageReference}</Text>
            )}
          </View>
        </View>
      );
    }

    switch (q.type) {
      case 'QUIZ':
        return (
          <View style={styles.playContent}>
            <Text style={styles.questionText}>{q.question}</Text>
            <View style={styles.optionsContainer}>
              {opts.map((opt, i) => {
                const isSelected = quizSelected === opt;
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setQuizSelected(opt)}
                  >
                    <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]} pointerEvents="none">
                      {isSelected && <View style={styles.optionRadioInner} />}
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 'SCRAMBLE': {
        const poolIndices = opts
          .map((_, idx) => idx)
          .filter((idx) => !scrambleSelectedIndices.includes(idx));

        return (
          <View style={styles.playContent}>
            <Text style={styles.questionText}>{q.question}</Text>

            {/* Area Penyusunan */}
            <View style={styles.scrambleDisplay}>
              {scrambleSelectedIndices.length === 0 ? (
                <Text style={styles.scramblePlaceholder}>Ketuk kata-kata di bawah untuk menyusun ayat...</Text>
              ) : (
                <View style={styles.scrambleWordsRow}>
                  {scrambleSelectedIndices.map((optIdx, pos) => (
                    <Pressable
                      key={`selected-${pos}`}
                      accessibilityRole="button"
                      style={styles.scrambleWordItem}
                      onPress={() => {
                        setScrambleSelectedIndices(scrambleSelectedIndices.filter((_, idx) => idx !== pos));
                      }}
                    >
                      <Text style={styles.scrambleWordItemText}>{opts[optIdx]}</Text>
                      <Ionicons name="close" size={12} color="#64748b" style={{ marginLeft: 3 }} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Pilihan Kata Acak */}
            <View style={styles.scramblePool}>
              {poolIndices.map((optIdx) => (
                <Pressable
                  key={`pool-${optIdx}`}
                  accessibilityRole="button"
                  style={styles.scramblePoolItem}
                  onPress={() => setScrambleSelectedIndices([...scrambleSelectedIndices, optIdx])}
                >
                  <Text style={styles.scramblePoolItemText}>{opts[optIdx]}</Text>
                </Pressable>
              ))}
            </View>

            {scrambleSelectedIndices.length > 0 && (
              <Pressable
                accessibilityRole="button"
                style={styles.scrambleResetBtn}
                onPress={() => setScrambleSelectedIndices([])}
              >
                <Text style={styles.scrambleResetBtnText}>Reset Susunan</Text>
              </Pressable>
            )}
          </View>
        );
      }

      case 'WORD_SEARCH':
        return (
          <View style={styles.playContent}>
            <Text style={styles.questionText}>{q.question}</Text>
            <Text style={styles.instructionText}>Ketuk untuk memilih/batalkan kata-kata yang termasuk buah Roh / murid:</Text>
            
            <View style={styles.wordSearchGrid}>
              {opts.map((word, i) => {
                const isSelected = wordSearchSelected.includes(word);
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.wordSearchBadge,
                      isSelected && styles.wordSearchBadgeSelected,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setWordSearchSelected(wordSearchSelected.filter((w) => w !== word));
                      } else {
                        setWordSearchSelected([...wordSearchSelected, word]);
                      }
                    }}
                  >
                    <Text style={[styles.wordSearchText, isSelected && styles.wordSearchTextSelected]}>
                      {word}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 'GUESS':
        return (
          <View style={styles.playContent}>
            <Text style={styles.questionText}>{q.question}</Text>
            
            <View style={styles.guessContainer}>
              <TextInput
                style={styles.guessInput}
                placeholder="Ketik jawaban tokoh Alkitab di sini..."
                value={guessInput}
                onChangeText={setGuessInput}
                autoCorrect={false}
              />
            </View>

            {q.hint && (
              <View style={styles.hintContainer}>
                {showHint ? (
                  <Text style={styles.hintText}>💡 Petunjuk: {q.hint}</Text>
                ) : (
                  <TouchableOpacity onPress={() => setShowHint(true)} style={styles.hintButton}>
                    <Text style={styles.hintButtonText}>Tampilkan Petunjuk</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const getMemberPhotoUri = (photoUrl: string | null) => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('http')) return photoUrl;
    return `${SERVER_BASE_URL}${photoUrl}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Game Alkitab Eklesia</Text>
        </View>
      </View>

      {/* Profile Card Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Skor Total</Text>
          <Text style={styles.statValue}>🏆 {profile.totalPoints} pts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Streak Main</Text>
          <Text style={styles.statValue}>🔥 {profile.currentStreak} hari</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Peringkat</Text>
          <Text style={styles.statValue}>⭐ Ke-{profile.rank}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'PLAY' && styles.tabActive]}
          onPress={() => setActiveTab('PLAY')}
        >
          <Ionicons name="game-controller-outline" size={16} color={activeTab === 'PLAY' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'PLAY' && styles.tabTextActive]}>Bermain</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'LEADERBOARD' && styles.tabActive]}
          onPress={() => setActiveTab('LEADERBOARD')}
        >
          <Ionicons name="trophy-outline" size={16} color={activeTab === 'LEADERBOARD' ? '#3b82f6' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'LEADERBOARD' && styles.tabTextActive]}>Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'PLAY' ? (
        loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>
        ) : questions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada kuis harian aktif saat ini.</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Step Stepper Header */}
            <View style={styles.stepperContainer}>
              <Text style={styles.stepperText}>
                Tantangan {currentIdx + 1} dari {questions.length}
              </Text>
              <View style={styles.stepperDots}>
                {questions.map((q, i) => (
                  <View
                    key={i}
                    style={[
                      styles.stepperDot,
                      i === currentIdx && styles.dotActive,
                      q.isAttempted && (q.isCorrect ? styles.dotCorrect : styles.dotIncorrect),
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Active Game Card */}
            <ScrollView
              style={styles.gameCardScroll}
              contentContainerStyle={styles.gameCardContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.gameCard}>
                <View style={styles.gameCardHeader}>
                  <View style={styles.gameTypeBadge}>
                    <Text style={styles.gameTypeBadgeText}>
                      {questions[currentIdx].type === 'QUIZ' && '📖 Trivia Pilihan Ganda'}
                      {questions[currentIdx].type === 'SCRAMBLE' && '🧩 Susun Ayat Alkitab'}
                      {questions[currentIdx].type === 'WORD_SEARCH' && '🔍 Cari Kata Buah/Murid'}
                      {questions[currentIdx].type === 'GUESS' && '👤 Tebak Tokoh Alkitab'}
                    </Text>
                  </View>
                  <Text style={styles.gameCardPoints}>+{questions[currentIdx].points} Poin</Text>
                </View>

                {renderQuestionPlay(questions[currentIdx])}
              </View>
            </ScrollView>

            {/* Bottom Play Actions */}
            <View style={styles.actionRow}>
              {/* Navigate Prev */}
              <TouchableOpacity
                style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
                onPress={handlePrev}
                disabled={currentIdx === 0}
              >
                <Ionicons name="arrow-back" size={20} color={currentIdx === 0 ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>

              {/* Submit / Next Button */}
              {!feedback?.submitted ? (
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleSubmitAnswer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Kirim Jawaban</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={currentIdx === questions.length - 1 ? loadGameData : handleNext}
                >
                  <Text style={styles.submitBtnText}>
                    {currentIdx === questions.length - 1 ? 'Segarkan Game' : 'Pertanyaan Selanjutnya'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Navigate Next */}
              <TouchableOpacity
                style={[styles.navBtn, currentIdx === questions.length - 1 && styles.navBtnDisabled]}
                onPress={handleNext}
                disabled={currentIdx === questions.length - 1}
              >
                <Ionicons name="arrow-forward" size={20} color={currentIdx === questions.length - 1 ? '#cbd5e1' : '#475569'} />
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        /* Tab Leaderboard */
        leaderboardLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#3b82f6" /></View>
        ) : (
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => item.memberId}
            contentContainerStyle={styles.leaderboardList}
            renderItem={({ item, index }) => {
              const isCurrentUser = item.memberId === profile?.memberId; // Local check can be added
              return (
                <View style={[styles.leaderboardItem, isCurrentUser && styles.leaderboardItemUser]}>
                  {/* Rank */}
                  <View style={styles.rankContainer}>
                    {index === 0 && <Text style={styles.trophy}>🥇</Text>}
                    {index === 1 && <Text style={styles.trophy}>🥈</Text>}
                    {index === 2 && <Text style={styles.trophy}>🥉</Text>}
                    {index > 2 && <Text style={styles.rankText}>{item.rank}</Text>}
                  </View>

                  {/* Photo */}
                  <View style={styles.photoContainer}>
                    {item.photoUrl ? (
                      <Image
                        source={{ uri: getMemberPhotoUri(item.photoUrl) || '' }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={16} color="#94a3b8" />
                      </View>
                    )}
                  </View>

                  {/* Name and Streak */}
                  <View style={styles.nameContainer}>
                    <Text style={styles.leaderboardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.currentStreak > 0 && (
                      <Text style={styles.leaderboardStreak}>🔥 {item.currentStreak} hari streak</Text>
                    )}
                  </View>

                  {/* Score */}
                  <View style={styles.scoreContainer}>
                    <Text style={styles.leaderboardScore}>{item.totalPoints} pts</Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Papan peringkat masih kosong.</Text>
              </View>
            }
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  closeButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  
  // Stats Row
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 13, fontWeight: 'bold', color: '#1e293b', marginTop: 2 },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#3b82f6' },

  // Content Containers
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#64748b', textAlign: 'center', fontSize: 14 },

  // Stepper UI
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stepperText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  stepperDots: { flexDirection: 'row', gap: 6 },
  stepperDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' },
  dotActive: { backgroundColor: '#3b82f6', transform: [{ scale: 1.2 }] },
  dotCorrect: { backgroundColor: '#10b981' },
  dotIncorrect: { backgroundColor: '#ef4444' },

  // Card UI
  gameCardScroll: { flex: 1, marginTop: 12 },
  gameCardContent: { paddingHorizontal: 16, paddingBottom: 24 },
  gameCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 3,
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  gameTypeBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gameTypeBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#1d4ed8' },
  gameCardPoints: { fontSize: 12, fontWeight: '700', color: '#059669' },

  // Gameplay specific UIs
  playContent: { flex: 1 },
  questionText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', lineHeight: 24, marginBottom: 16 },
  instructionText: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  optionsContainer: { gap: 10 },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#fff',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' as const } : {}),
  },
  optionButtonSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: { borderColor: '#3b82f6' },
  optionRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' },
  optionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    ...(Platform.OS === 'web' ? { userSelect: 'none' as const, pointerEvents: 'none' as const } : {}),
  },
  optionTextSelected: { color: '#1e40af', fontWeight: '600' },

  // Scramble UI
  scrambleDisplay: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 16,
    justifyContent: 'center',
  },
  scramblePlaceholder: { fontSize: 13, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' },
  scrambleWordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scrambleWordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' as const } : {}),
  },
  scrambleWordItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    ...(Platform.OS === 'web' ? { userSelect: 'none' as const, pointerEvents: 'none' as const } : {}),
  },
  scramblePool: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  scramblePoolItem: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' as const } : {}),
  },
  scramblePoolItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    ...(Platform.OS === 'web' ? { userSelect: 'none' as const, pointerEvents: 'none' as const } : {}),
  },
  scrambleResetBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' as const } : {}),
  },
  scrambleResetBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

  // Word Search UI
  wordSearchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wordSearchBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' as const } : {}),
  },
  wordSearchBadgeSelected: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  wordSearchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    ...(Platform.OS === 'web' ? { userSelect: 'none' as const, pointerEvents: 'none' as const } : {}),
  },
  wordSearchTextSelected: { color: '#2563eb' },

  // Guess UI
  guessContainer: { marginBottom: 12 },
  guessInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  hintContainer: { marginTop: 8 },
  hintButton: { alignSelf: 'flex-start' },
  hintButtonText: { fontSize: 12, color: '#3b82f6', fontWeight: '600' },
  hintText: { fontSize: 12, color: '#475569', fontStyle: 'italic', backgroundColor: '#fffbeb', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fef3c7' },

  // Feedback UIs
  feedbackContainer: { alignItems: 'center', paddingVertical: 10 },
  feedbackBadge: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
  },
  badgeSuccess: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  badgeFail: { backgroundColor: '#fff5f5', borderWidth: 1, borderColor: '#fecdd3' },
  feedbackBadgeText: { fontSize: 16, fontWeight: '800' },
  textSuccess: { color: '#065f46' },
  textFail: { color: '#991b1b' },
  feedbackPoints: { fontSize: 13, fontWeight: '700', color: '#475569' },
  
  correctAnswerBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  correctAnswerLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  correctAnswerText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  passageRef: { fontSize: 12, color: '#3b82f6', fontWeight: '600', marginTop: 8 },

  // Play Bottom Actions Row
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    gap: 12,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  navBtnDisabled: { backgroundColor: '#f1f5f9', borderColor: '#f1f5f9' },
  submitBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Leaderboard UI List
  leaderboardList: { padding: 16 },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  leaderboardItemUser: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  rankContainer: { width: 32, alignItems: 'center' },
  trophy: { fontSize: 20 },
  rankText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
  photoContainer: { marginLeft: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: { flex: 1, marginLeft: 12 },
  leaderboardName: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  leaderboardStreak: { fontSize: 10, color: '#f59e0b', fontWeight: '600', marginTop: 1 },
  scoreContainer: { alignItems: 'flex-end', marginLeft: 8 },
  leaderboardScore: { fontSize: 14, fontWeight: '800', color: '#3b82f6' },
});
