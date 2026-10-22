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
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { client, SERVER_BASE_URL } from '../api/client';
import { HolyGraceColors, Shadows } from '../theme/colors';

const { width } = Dimensions.get('window');

interface GameScreenProps {
  onClose: () => void;
}

type TabType = 'WORDLE' | 'TRIVIA' | 'LEADERBOARD';

export default function GameScreen({ onClose }: GameScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('WORDLE');
  const [loading, setLoading] = useState(true);

  // Profile Stats
  const [profile, setProfile] = useState<{
    totalPoints: number;
    currentStreak: number;
    maxStreak: number;
    rank: string | number;
  }>({
    totalPoints: 0,
    currentStreak: 0,
    maxStreak: 0,
    rank: '-',
  });

  // =========================================================================
  // WORDLE STATES
  // =========================================================================
  const [wordleData, setWordleData] = useState<any>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [submittingWordle, setSubmittingWordle] = useState(false);

  // =========================================================================
  // TRIVIA STATES
  // =========================================================================
  const [triviaQuestions, setTriviaQuestions] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [triviaCurrentIdx, setTriviaCurrentIdx] = useState(0);
  const [selectedTriviaOption, setSelectedTriviaOption] = useState<string | null>(null);
  const [submittingTrivia, setSubmittingTrivia] = useState(false);
  const [triviaFeedback, setTriviaFeedback] = useState<any>(null);

  // =========================================================================
  // LEADERBOARD STATES
  // =========================================================================
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Load all initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [profileRes, wordleRes, triviaRes] = await Promise.all([
        client.get('/game/profile'),
        client.get('/game/wordle/today'),
        client.get('/game/trivia'),
      ]);
      setProfile(profileRes.data);
      setWordleData(wordleRes.data);
      setTriviaQuestions(triviaRes.data || []);
      
      // Init trivia index to first unattempted
      const unattemptedIdx = triviaRes.data.findIndex((q: any) => !q.isAttempted);
      setTriviaCurrentIdx(unattemptedIdx !== -1 ? unattemptedIdx : 0);
    } catch (err: any) {
      console.log('Error loading game data:', err);
      Alert.alert('Error', 'Gagal memuat data game Alkitab');
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
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'LEADERBOARD') {
      loadLeaderboard();
    }
  }, [activeTab]);

  // Update feedback when active trivia question changes
  useEffect(() => {
    if (triviaQuestions.length > 0 && triviaQuestions[triviaCurrentIdx]) {
      const q = triviaQuestions[triviaCurrentIdx];
      setSelectedTriviaOption(null);
      if (q.isAttempted) {
        setTriviaFeedback({
          isCorrect: q.isCorrect,
          correctAnswer: q.correctAnswer,
          passageReference: q.passageReference,
          explanation: q.explanation,
        });
      } else {
        setTriviaFeedback(null);
      }
    }
  }, [triviaCurrentIdx, triviaQuestions]);

  // =========================================================================
  // WORDLE LOGIC
  // =========================================================================
  const handleKeyPress = (letter: string) => {
    if (!wordleData || wordleData.isGameOver) return;
    const wordLen = wordleData.wordLength || 5;

    if (letter === 'BACK') {
      setCurrentGuess((prev) => prev.slice(0, -1));
    } else if (letter === 'ENTER') {
      handleSubmitWordle();
    } else {
      if (currentGuess.length < wordLen) {
        setCurrentGuess((prev) => (prev + letter).toUpperCase());
      }
    }
  };

  const handleSubmitWordle = async () => {
    if (!wordleData || submittingWordle) return;
    const wordLen = wordleData.wordLength || 5;

    if (currentGuess.length !== wordLen) {
      return Alert.alert('Kata Kurang', `Tebakan harus terdiri dari ${wordLen} huruf.`);
    }

    setSubmittingWordle(true);
    try {
      const res = await client.post('/game/wordle/guess', {
        wordleId: wordleData.id,
        guess: currentGuess,
      });

      setWordleData((prev: any) => ({
        ...prev,
        guesses: res.data.guesses,
        evaluatedGuesses: res.data.evaluatedGuesses,
        isSolved: res.data.isSolved,
        isGameOver: res.data.isGameOver,
        word: res.data.word,
        passageReference: res.data.passageReference,
        passageText: res.data.passageText,
        devotionalSnippet: res.data.devotionalSnippet,
        remainingAttempts: res.data.remainingAttempts,
      }));

      setCurrentGuess('');

      if (res.data.isSolved) {
        Alert.alert('Luar Biasa! 🎉', `Jawaban Anda tepat! Anda mendapatkan +${res.data.pointsEarned} Poin.`);
        // Reload stats
        const profileRes = await client.get('/game/profile');
        setProfile(profileRes.data);
      } else if (res.data.isGameOver) {
        Alert.alert('Selesai', `Kesempatan menebak hari ini telah habis. Kata hari ini adalah "${res.data.word}".`);
      }
    } catch (err: any) {
      Alert.alert('Peringatan', err.response?.data?.error || err.message);
    } finally {
      setSubmittingWordle(false);
    }
  };

  const handleShareWordle = async () => {
    if (!wordleData || !wordleData.evaluatedGuesses) return;

    let gridEmojis = '';
    wordleData.evaluatedGuesses.forEach((guessRow: any[]) => {
      guessRow.forEach((cell: any) => {
        if (cell.status === 'CORRECT') gridEmojis += '🟩';
        else if (cell.status === 'PRESENT') gridEmojis += '🟨';
        else gridEmojis += '⬜';
      });
      gridEmojis += '\n';
    });

    const attemptsCount = wordleData.isSolved ? wordleData.guesses.length : 'X';
    const message = `✨ Wordle Firman (${wordleData.dateStr})\nHasil: ${attemptsCount}/6\n\n${gridEmojis}\nMainkan firman harian di aplikasi gereja kita! 🙏`;

    try {
      await Share.share({ message });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  // Status mapping for on-screen keyboard keys
  const getKeyStatus = (char: string): 'CORRECT' | 'PRESENT' | 'ABSENT' | 'DEFAULT' => {
    if (!wordleData?.evaluatedGuesses) return 'DEFAULT';

    let hasPresent = false;
    let hasAbsent = false;

    for (const row of wordleData.evaluatedGuesses) {
      for (const cell of row) {
        if (cell.letter === char) {
          if (cell.status === 'CORRECT') return 'CORRECT';
          if (cell.status === 'PRESENT') hasPresent = true;
          if (cell.status === 'ABSENT') hasAbsent = true;
        }
      }
    }

    if (hasPresent) return 'PRESENT';
    if (hasAbsent) return 'ABSENT';
    return 'DEFAULT';
  };

  // =========================================================================
  // TRIVIA LOGIC
  // =========================================================================
  const filteredTriviaQuestions = triviaQuestions.filter((q) => {
    if (selectedCategory === 'ALL') return true;
    return q.category === selectedCategory;
  });

  const currentTriviaQ = filteredTriviaQuestions[triviaCurrentIdx] || null;

  const handleSubmitTrivia = async (selectedOpt: string) => {
    if (!currentTriviaQ || submittingTrivia || currentTriviaQ.isAttempted) return;

    setSelectedTriviaOption(selectedOpt);
    setSubmittingTrivia(true);

    try {
      const res = await client.post('/game/trivia/submit', {
        questionId: currentTriviaQ.id,
        answer: selectedOpt,
      });

      const { isCorrect, pointsEarned, correctAnswer, passageReference, explanation } = res.data;

      // Update local state
      const updated = triviaQuestions.map((q) => {
        if (q.id === currentTriviaQ.id) {
          return {
            ...q,
            isAttempted: true,
            isCorrect,
            correctAnswer,
            passageReference,
            explanation,
            userAnswer: selectedOpt,
          };
        }
        return q;
      });
      setTriviaQuestions(updated);

      setTriviaFeedback({
        isCorrect,
        correctAnswer,
        passageReference,
        explanation,
      });

      // Refresh score
      const profileRes = await client.get('/game/profile');
      setProfile(profileRes.data);
    } catch (err: any) {
      Alert.alert('Gagal', err.response?.data?.error || err.message);
    } finally {
      setSubmittingTrivia(false);
    }
  };

  // Keyboard Rows for Wordle
  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '600' }}>
          Menyiapkan Firman & Game Alkitab...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Game Alkitab</Text>
          <Text style={styles.headerSubtitle}>Tumbuh dalam iman & pengetahuan firman</Text>
        </View>

        {/* Stats Pill */}
        <View style={styles.statsPill}>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {profile.currentStreak}</Text>
          </View>
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsText}>🌟 {profile.totalPoints} Poin</Text>
          </View>
        </View>
      </View>

      {/* TOP TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'WORDLE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('WORDLE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'WORDLE' && styles.tabBtnTextActive]}>
            🟩 Wordle Firman
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'TRIVIA' && styles.tabBtnActive]}
          onPress={() => setActiveTab('TRIVIA')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'TRIVIA' && styles.tabBtnTextActive]}>
            📖 Tangga Iman
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'LEADERBOARD' && styles.tabBtnActive]}
          onPress={() => setActiveTab('LEADERBOARD')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, activeTab === 'LEADERBOARD' && styles.tabBtnTextActive]}>
            🏆 Peringkat
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB CONTENT */}
      {activeTab === 'WORDLE' && (
        <ScrollView contentContainerStyle={styles.tabScrollContent} keyboardShouldPersistTaps="handled">
          {/* Wordle Header Info */}
          <View style={styles.wordleInfoBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.wordleTitle}>Tebak Kata Firman Hari Ini</Text>
              <View style={styles.attemptBadge}>
                <Text style={styles.attemptBadgeText}>
                  {wordleData?.remainingAttempts} Kesempatan
                </Text>
              </View>
            </View>
            {wordleData?.clue && (
              <Text style={styles.wordleClue}>💡 Petunjuk: {wordleData.clue}</Text>
            )}
          </View>

          {/* Wordle Grid (6 Rows) */}
          <View style={styles.gridContainer}>
            {Array.from({ length: 6 }).map((_, rowIndex) => {
              const wordLen = wordleData?.wordLength || 5;
              const isCurrentRow = rowIndex === (wordleData?.guesses?.length || 0);
              const evaluatedRow = wordleData?.evaluatedGuesses?.[rowIndex] || null;

              return (
                <View key={`row-${rowIndex}`} style={styles.gridRow}>
                  {Array.from({ length: wordLen }).map((_, colIndex) => {
                    let letter = '';
                    let status: 'CORRECT' | 'PRESENT' | 'ABSENT' | 'EMPTY' = 'EMPTY';

                    if (evaluatedRow && evaluatedRow[colIndex]) {
                      letter = evaluatedRow[colIndex].letter;
                      status = evaluatedRow[colIndex].status;
                    } else if (isCurrentRow && currentGuess[colIndex]) {
                      letter = currentGuess[colIndex];
                    }

                    return (
                      <View
                        key={`col-${colIndex}`}
                        style={[
                          styles.gridCell,
                          status === 'CORRECT' && styles.cellCorrect,
                          status === 'PRESENT' && styles.cellPresent,
                          status === 'ABSENT' && styles.cellAbsent,
                          isCurrentRow && letter ? styles.cellActiveTyping : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.cellLetter,
                            (status === 'CORRECT' || status === 'PRESENT' || status === 'ABSENT') &&
                              styles.cellLetterColored,
                          ]}
                        >
                          {letter}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {/* Game Over Devotional & Scripture Card */}
          {wordleData?.isGameOver && (
            <View style={styles.devotionalCard}>
              <View style={styles.devotionalHeader}>
                <Ionicons
                  name={wordleData.isSolved ? 'trophy' : 'book'}
                  size={24}
                  color={wordleData.isSolved ? '#f59e0b' : '#3b82f6'}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.devotionalTitle}>
                  {wordleData.isSolved ? '🎉 Jawaban Tepat: ' : 'Firman Hari Ini: '}
                  <Text style={{ color: '#2563eb' }}>{wordleData.word}</Text>
                </Text>
              </View>

              <View style={styles.verseBox}>
                <Text style={styles.verseRef}>📍 {wordleData.passageReference}</Text>
                <Text style={styles.verseText}>"{wordleData.passageText}"</Text>
              </View>

              <Text style={styles.devotionalText}>{wordleData.devotionalSnippet}</Text>

              <TouchableOpacity style={styles.shareBtn} onPress={handleShareWordle} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.shareBtnText}>Bagikan Hasil ke WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Virtual Keyboard (Only if game is still active) */}
          {!wordleData?.isGameOver && (
            <View style={styles.keyboardContainer}>
              {KEYBOARD_ROWS.map((row, rIdx) => (
                <View key={`kb-row-${rIdx}`} style={styles.keyboardRow}>
                  {row.map((char) => {
                    const status = getKeyStatus(char);
                    const isSpecial = char === 'ENTER' || char === 'BACK';

                    return (
                      <TouchableOpacity
                        key={char}
                        style={[
                          styles.keyBtn,
                          isSpecial && styles.specialKeyBtn,
                          status === 'CORRECT' && styles.keyCorrect,
                          status === 'PRESENT' && styles.keyPresent,
                          status === 'ABSENT' && styles.keyAbsent,
                        ]}
                        onPress={() => handleKeyPress(char)}
                        activeOpacity={0.7}
                      >
                        {char === 'BACK' ? (
                          <Ionicons name="backspace-outline" size={20} color="#0f172a" />
                        ) : (
                          <Text
                            style={[
                              styles.keyBtnText,
                              (status === 'CORRECT' || status === 'PRESENT' || status === 'ABSENT') &&
                                styles.keyTextColored,
                            ]}
                          >
                            {char === 'ENTER' ? 'KIRIM' : char}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB 2: TANGGA IMAN (TRIVIA) */}
      {activeTab === 'TRIVIA' && (
        <ScrollView contentContainerStyle={styles.tabScrollContent}>
          {/* Category Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {[
              { id: 'ALL', label: 'Semua Soal' },
              { id: 'TOKOH', label: '👑 Tokoh Iman' },
              { id: 'MUKJIZAT', label: '✨ Mukjizat' },
              { id: 'KISAH_RASUL', label: '🕊️ Kisah Para Rasul' },
              { id: 'AMSAL', label: '📜 Amsal Hikmat' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setTriviaCurrentIdx(0);
                }}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    selectedCategory === cat.id && styles.categoryPillTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {filteredTriviaQuestions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="book-outline" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Belum Ada Pertanyaan</Text>
              <Text style={styles.emptySubtitle}>Pilih kategori lain untuk melihat soal kuis Alkitab.</Text>
            </View>
          ) : currentTriviaQ ? (
            <View style={styles.triviaCard}>
              {/* Question Header */}
              <View style={styles.triviaMetaRow}>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>
                    {currentTriviaQ.category || 'UMUM'} • Soal {triviaCurrentIdx + 1} dari{' '}
                    {filteredTriviaQuestions.length}
                  </Text>
                </View>
                <Text style={styles.pointsEarnedText}>+{currentTriviaQ.points || 15} Poin</Text>
              </View>

              <Text style={styles.triviaQuestionText}>{currentTriviaQ.question}</Text>

              {/* Options */}
              <View style={styles.triviaOptionsWrapper}>
                {(currentTriviaQ.options || []).map((opt: string, idx: number) => {
                  const isAttempted = currentTriviaQ.isAttempted;
                  const isCorrectAnswer = opt === currentTriviaQ.correctAnswer;
                  const isUserSelection = opt === currentTriviaQ.userAnswer || opt === selectedTriviaOption;

                  let icon = 'ellipse-outline';
                  let iconColor = '#94a3b8';

                  if (isAttempted) {
                    if (isCorrectAnswer) {
                      icon = 'checkmark-circle';
                      iconColor = '#16a34a';
                    } else if (isUserSelection) {
                      icon = 'close-circle';
                      iconColor = '#dc2626';
                    }
                  } else if (isUserSelection) {
                    icon = 'radio-button-on';
                    iconColor = '#2563eb';
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.triviaOptionBtn,
                        !isAttempted && isUserSelection && styles.triviaOptionSelected,
                        isAttempted && isCorrectAnswer && styles.triviaOptionCorrect,
                        isAttempted && isUserSelection && !isCorrectAnswer && styles.triviaOptionWrong,
                      ]}
                      disabled={isAttempted || submittingTrivia}
                      onPress={() => handleSubmitTrivia(opt)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={icon as any} size={20} color={iconColor} style={{ marginRight: 10 }} />
                      <Text
                        style={[
                          styles.triviaOptionText,
                          !isAttempted && isUserSelection && { color: '#1d4ed8', fontWeight: '700' as const },
                          isAttempted && isCorrectAnswer && { color: '#166534', fontWeight: '700' as const },
                          isAttempted && isUserSelection && !isCorrectAnswer && { color: '#991b1b', fontWeight: '700' as const },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Feedback & Explanation Box */}
              {triviaFeedback && (
                <View
                  style={[
                    styles.explanationBox,
                    triviaFeedback.isCorrect ? styles.explanationSuccess : styles.explanationFail,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons
                      name={triviaFeedback.isCorrect ? 'checkmark-circle' : 'information-circle'}
                      size={20}
                      color={triviaFeedback.isCorrect ? '#16a34a' : '#2563eb'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.explanationTitle,
                        { color: triviaFeedback.isCorrect ? '#166534' : '#1e3a8a' },
                      ]}
                    >
                      {triviaFeedback.isCorrect ? 'Jawaban Tepat! (+15 Poin)' : 'Pembahasan Firman:'}
                    </Text>
                  </View>

                  {triviaFeedback.passageReference && (
                    <Text style={styles.explanationRef}>📍 Referensi: {triviaFeedback.passageReference}</Text>
                  )}
                  <Text style={styles.explanationText}>
                    {triviaFeedback.explanation || 'Renungkanlah firman ini setiap hari dalam kehidupan Anda.'}
                  </Text>
                </View>
              )}

              {/* Next & Previous Navigation Buttons */}
              <View style={styles.navButtonsRow}>
                <TouchableOpacity
                  style={[styles.navBtn, triviaCurrentIdx === 0 && { opacity: 0.4 }]}
                  disabled={triviaCurrentIdx === 0}
                  onPress={() => setTriviaCurrentIdx((prev) => Math.max(0, prev - 1))}
                >
                  <Ionicons name="arrow-back" size={16} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.navBtnText}>Sebelumnya</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.navBtn,
                    styles.navBtnPrimary,
                    triviaCurrentIdx >= filteredTriviaQuestions.length - 1 && { opacity: 0.4 },
                  ]}
                  disabled={triviaCurrentIdx >= filteredTriviaQuestions.length - 1}
                  onPress={() =>
                    setTriviaCurrentIdx((prev) => Math.min(filteredTriviaQuestions.length - 1, prev + 1))
                  }
                >
                  <Text style={styles.navBtnPrimaryText}>Selanjutnya</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* TAB 3: LEADERBOARD */}
      {activeTab === 'LEADERBOARD' && (
        <ScrollView contentContainerStyle={styles.tabScrollContent}>
          {/* User Score Summary Card */}
          <View style={styles.myRankCard}>
            <View style={styles.myRankRow}>
              <View style={styles.myRankCol}>
                <Text style={styles.myRankLabel}>Peringkat Anda</Text>
                <Text style={styles.myRankValue}>#{profile.rank}</Text>
              </View>
              <View style={styles.dividerCol} />
              <View style={styles.myRankCol}>
                <Text style={styles.myRankLabel}>Total Poin</Text>
                <Text style={styles.myRankValue}>{profile.totalPoints}</Text>
              </View>
              <View style={styles.dividerCol} />
              <View style={styles.myRankCol}>
                <Text style={styles.myRankLabel}>Streak Api</Text>
                <Text style={styles.myRankValue}>🔥 {profile.currentStreak} Hari</Text>
              </View>
            </View>
          </View>

          {/* Leaderboard List */}
          <Text style={styles.sectionHeader}>Top Jemaat Minggu Ini</Text>

          {leaderboardLoading ? (
            <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 20 }} />
          ) : leaderboard.length === 0 ? (
            <Text style={styles.emptyListText}>Belum ada jemaat yang tercatat di papan peringkat.</Text>
          ) : (
            leaderboard.map((item, index) => {
              const isTop3 = index < 3;
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;

              return (
                <View key={item.memberId} style={[styles.leaderboardRow, isTop3 && styles.leaderboardTopRow]}>
                  <Text style={styles.medalText}>{medal}</Text>

                  <View style={styles.memberAvatar}>
                    {item.photoUrl ? (
                      <Image source={{ uri: `${SERVER_BASE_URL}${item.photoUrl}` }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarInitial}>{item.name?.charAt(0).toUpperCase()}</Text>
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.leaderboardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.leaderboardStreak}>🔥 {item.currentStreak} hari aktif</Text>
                  </View>

                  <View style={styles.pointsBadgeItem}>
                    <Text style={styles.pointsBadgeItemText}>{item.totalPoints} Poin</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HolyGraceColors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: HolyGraceColors.background,
    padding: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  statsPill: {
    flexDirection: 'row',
    gap: 6,
  },
  streakBadge: {
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  pointsBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  pointsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#ffffff',
  },

  tabScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Wordle UI
  wordleInfoBox: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Shadows.sm,
  },
  wordleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  attemptBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attemptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  wordleClue: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },

  gridContainer: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  gridCell: {
    width: Math.min((width - 64) / 5, 54),
    height: Math.min((width - 64) / 5, 54),
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  cellActiveTyping: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  cellCorrect: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  cellPresent: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  cellAbsent: {
    backgroundColor: '#64748b',
    borderColor: '#475569',
  },
  cellLetter: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  cellLetterColored: {
    color: '#ffffff',
  },

  devotionalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    ...Shadows.md,
  },
  devotionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  devotionalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  verseBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    marginBottom: 10,
  },
  verseRef: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 4,
  },
  verseText: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  devotionalText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 14,
  },
  shareBtn: {
    backgroundColor: '#25d366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
  },
  shareBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },

  // On-Screen Keyboard
  keyboardContainer: {
    marginTop: 6,
    gap: 6,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  keyBtn: {
    flex: 1,
    maxWidth: 38,
    height: 44,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialKeyBtn: {
    maxWidth: 58,
    backgroundColor: '#cbd5e1',
  },
  keyCorrect: {
    backgroundColor: '#10b981',
  },
  keyPresent: {
    backgroundColor: '#f59e0b',
  },
  keyAbsent: {
    backgroundColor: '#64748b',
  },
  keyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  keyTextColored: {
    color: '#ffffff',
  },

  // Trivia UI
  categoryScroll: {
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 16,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },

  triviaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Shadows.md,
  },
  triviaMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  pointsEarnedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16a34a',
  },
  triviaQuestionText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
    marginBottom: 16,
  },
  triviaOptionsWrapper: {
    gap: 10,
    marginBottom: 14,
  },
  triviaOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  triviaOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  triviaOptionCorrect: {
    backgroundColor: '#f0fdf4',
    borderColor: '#16a34a',
  },
  triviaOptionWrong: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  triviaOptionText: {
    fontSize: 13.5,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },

  explanationBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  explanationSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  explanationFail: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  explanationTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  explanationRef: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },

  navButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  navBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
  },
  navBtnPrimary: {
    backgroundColor: '#2563eb',
  },
  navBtnPrimaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Leaderboard UI
  myRankCard: {
    backgroundColor: '#1e3a8a',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    ...Shadows.md,
  },
  myRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  myRankCol: {
    flex: 1,
    alignItems: 'center',
  },
  dividerCol: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  myRankLabel: {
    fontSize: 11,
    color: '#93c5fd',
    fontWeight: '600',
    marginBottom: 4,
  },
  myRankValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },

  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  leaderboardTopRow: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  medalText: {
    fontSize: 18,
    fontWeight: '900',
    width: 32,
    textAlign: 'center',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563eb',
  },
  leaderboardName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  leaderboardStreak: {
    fontSize: 11,
    color: '#ea580c',
    fontWeight: '600',
    marginTop: 2,
  },
  pointsBadgeItem: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pointsBadgeItemText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  emptyListText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 20,
  },
});
