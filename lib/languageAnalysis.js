// Language drift detection for Pendulum
// Analyzes entries for patterns in urgency, temporal orientation, and repetition

// Urgency markers
const URGENCY_HIGH = ['need to', 'have to', 'must', 'should', 'urgent', 'immediately', 'asap', 'can\'t wait', 'running out'];
const URGENCY_LOW = ['want to', 'choosing to', 'might', 'could', 'considering', 'exploring', 'allowing', 'letting'];

// Temporal markers
const FUTURE_MARKERS = ['will', 'going to', 'gonna', 'planning to', 'hope to', 'want to', 'when i', 'someday', 'eventually', 'soon', 'later', 'tomorrow', 'next'];
const PRESENT_MARKERS = ['right now', 'today', 'currently', 'at this moment', 'i am', 'i\'m feeling', 'here', 'now'];
const PAST_MARKERS = ['was', 'were', 'used to', 'back when', 'remember', 'before', 'yesterday', 'last'];

// Agency markers
const PASSIVE_MARKERS = ['it happened', 'things are', 'life is', 'they made me', 'i had to', 'no choice', 'forced'];
const ACTIVE_MARKERS = ['i chose', 'i decided', 'i\'m creating', 'i built', 'i made', 'my decision', 'i own'];

export function analyzeLanguage(currentEntry, previousEntries = []) {
  const analysis = {
    urgency: analyzeUrgency(currentEntry),
    temporal: analyzeTemporalOrientation(currentEntry),
    agency: analyzeAgency(currentEntry),
    repetition: analyzeRepetition(currentEntry, previousEntries),
    shifts: analyzeShifts(currentEntry, previousEntries),
    thresholdAlerts: detectThresholdAlerts(currentEntry, previousEntries)
  };

  return analysis;
}

// Detect threshold alerts (patterns circled 3+ times without action)
function detectThresholdAlerts(currentEntry, previousEntries = []) {
  if (!previousEntries || previousEntries.length < 3) {
    return [];
  }
  
  const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'about', 'been', 'being', 'get', 'got', 'going', 'like', 'really', 'think', 'know', 'want', 'feel', 'make', 'way', 'thing', 'things', 'something', 'anything', 'everything', 'nothing', 'still', 'keep', 'much', 'even', 'back', 'also', 'time', 'year', 'day', 'people', 'come', 'take', 'give', 'say', 'tell', 'see', 'look', 'find', 'work', 'seem', 'leave', 'put', 'mean', 'become', 'let', 'begin', 'help', 'show', 'hear', 'play', 'run', 'move', 'live', 'believe', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach', 'kill', 'remain']);
  
  const getSignificantWords = (text) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4 && !commonWords.has(word));
  };
  
  // Count word frequency across all entries including current
  const allEntries = [...previousEntries.slice(-10), { entry_text: currentEntry }];
  const wordCounts = {};
  
  for (const entry of allEntries) {
    const entryText = entry.entry || entry.entry_text || '';
    const words = getSignificantWords(entryText);
    const seenInEntry = new Set();
    
    for (const word of words) {
      if (!seenInEntry.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
        seenInEntry.add(word);
      }
    }
  }
  
  // Find words that appear in 3+ entries
  const thresholdAlerts = [];
  for (const [word, count] of Object.entries(wordCounts)) {
    if (count >= 3) {
      thresholdAlerts.push({ word, count });
    }
  }
  
  // Sort by count and return top 2
  thresholdAlerts.sort((a, b) => b.count - a.count);
  return thresholdAlerts.slice(0, 2);
}

function countMatches(text, patterns) {
  const lowerText = text.toLowerCase();
  let count = 0;
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.toLowerCase(), 'gi');
    const matches = lowerText.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

function analyzeUrgency(text) {
  const highCount = countMatches(text, URGENCY_HIGH);
  const lowCount = countMatches(text, URGENCY_LOW);
  const total = highCount + lowCount;
  
  if (total === 0) return { level: 'neutral', score: 0 };
  
  const score = (highCount - lowCount) / total;
  
  let level = 'neutral';
  if (score > 0.3) level = 'high';
  else if (score < -0.3) level = 'relaxed';
  
  return { level, score: Math.round(score * 100) / 100, highCount, lowCount };
}

function analyzeTemporalOrientation(text) {
  const futureCount = countMatches(text, FUTURE_MARKERS);
  const presentCount = countMatches(text, PRESENT_MARKERS);
  const pastCount = countMatches(text, PAST_MARKERS);
  const total = futureCount + presentCount + pastCount;
  
  if (total === 0) return { orientation: 'balanced', dominant: null };
  
  const scores = {
    future: futureCount / total,
    present: presentCount / total,
    past: pastCount / total
  };
  
  let dominant = 'balanced';
  if (scores.future > 0.5) dominant = 'future';
  else if (scores.present > 0.5) dominant = 'present';
  else if (scores.past > 0.5) dominant = 'past';
  
  return { 
    orientation: dominant, 
    scores: {
      future: Math.round(scores.future * 100),
      present: Math.round(scores.present * 100),
      past: Math.round(scores.past * 100)
    }
  };
}

function analyzeAgency(text) {
  const passiveCount = countMatches(text, PASSIVE_MARKERS);
  const activeCount = countMatches(text, ACTIVE_MARKERS);
  const total = passiveCount + activeCount;
  
  if (total === 0) return { level: 'neutral', score: 0 };
  
  const score = (activeCount - passiveCount) / total;
  
  let level = 'neutral';
  if (score > 0.3) level = 'high_agency';
  else if (score < -0.3) level = 'low_agency';
  
  return { level, score: Math.round(score * 100) / 100 };
}

function analyzeRepetition(currentEntry, previousEntries) {
  if (!previousEntries || previousEntries.length === 0) {
    return { repeatedWords: [], repeatedPhrases: [] };
  }
  
  // Get significant words from current entry (exclude common words)
  const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'about', 'been', 'being', 'get', 'got', 'going', 'like', 'really', 'think', 'know', 'want', 'feel', 'make', 'way', 'thing', 'things', 'something', 'anything', 'everything', 'nothing']);
  
  const getSignificantWords = (text) => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
  };
  
  const currentWords = getSignificantWords(currentEntry);
  const currentWordSet = new Set(currentWords);
  
  // Count word frequency across previous entries
  const wordFrequency = {};
  for (const entry of previousEntries) {
    const entryText = entry.entry || entry.entry_text || '';
    const words = getSignificantWords(entryText);
    const seenInEntry = new Set();
    for (const word of words) {
      if (!seenInEntry.has(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        seenInEntry.add(word);
      }
    }
  }
  
  // Find words that appear in current entry AND frequently in previous entries
  const repeatedWords = [];
  for (const word of currentWordSet) {
    if (wordFrequency[word] && wordFrequency[word] >= 2) {
      repeatedWords.push({ word, count: wordFrequency[word] + 1 });
    }
  }
  
  // Sort by frequency
  repeatedWords.sort((a, b) => b.count - a.count);
  
  return { 
    repeatedWords: repeatedWords.slice(0, 5),
    totalEntriesAnalyzed: previousEntries.length
  };
}

function analyzeShifts(currentEntry, previousEntries) {
  if (!previousEntries || previousEntries.length < 2) {
    return { detected: false };
  }
  
  // Get the most recent previous entry
  const recentEntry = previousEntries[previousEntries.length - 1];
  const recentText = recentEntry.entry || recentEntry.entry_text || '';
  
  const currentUrgency = analyzeUrgency(currentEntry);
  const previousUrgency = analyzeUrgency(recentText);
  
  const currentTemporal = analyzeTemporalOrientation(currentEntry);
  const previousTemporal = analyzeTemporalOrientation(recentText);
  
  const shifts = [];
  
  // Detect urgency shift
  if (currentUrgency.level !== previousUrgency.level) {
    if (currentUrgency.level === 'high' && previousUrgency.level !== 'high') {
      shifts.push('urgency_increased');
    } else if (currentUrgency.level === 'relaxed' && previousUrgency.level === 'high') {
      shifts.push('urgency_decreased');
    }
  }
  
  // Detect temporal shift
  if (currentTemporal.orientation !== previousTemporal.orientation) {
    shifts.push(`temporal_shift_to_${currentTemporal.orientation}`);
  }
  
  return {
    detected: shifts.length > 0,
    shifts
  };
}

export function formatLanguageContext(analysis) {
  const lines = [];
  
  // Urgency
  if (analysis.urgency.level === 'high') {
    lines.push('- Language shows heightened urgency');
  } else if (analysis.urgency.level === 'relaxed') {
    lines.push('- Language feels unhurried, spacious');
  }
  
  // Temporal
  if (analysis.temporal.orientation === 'future') {
    lines.push('- Orientation is future-heavy, reaching forward');
  } else if (analysis.temporal.orientation === 'past') {
    lines.push('- Orientation is past-focused, looking back');
  } else if (analysis.temporal.orientation === 'present') {
    lines.push('- Grounded in the present moment');
  }
  
  // Agency
  if (analysis.agency.level === 'low_agency') {
    lines.push('- Language suggests feeling acted upon rather than acting');
  } else if (analysis.agency.level === 'high_agency') {
    lines.push('- Strong sense of agency and ownership in language');
  }
  
  // Repetition
  if (analysis.repetition.repeatedWords && analysis.repetition.repeatedWords.length > 0) {
    const words = analysis.repetition.repeatedWords.slice(0, 3).map(w => `"${w.word}"`).join(', ');
    lines.push(`- Recurring words across entries: ${words}`);
  }

  // Threshold alerts (patterns circled 3+ times)
  if (analysis.thresholdAlerts && analysis.thresholdAlerts.length > 0) {
    for (const alert of analysis.thresholdAlerts) {
      lines.push(`- THRESHOLD ALERT: "${alert.word}" has appeared ${alert.count} times across recent entries. This pattern is asking for attention.`);
    }
  }
  
  // Shifts
  if (analysis.shifts.detected) {
    for (const shift of analysis.shifts.shifts) {
      if (shift === 'urgency_increased') {
        lines.push('- Notable shift: urgency has increased since last entry');
      } else if (shift === 'urgency_decreased') {
        lines.push('- Notable shift: urgency has softened since last entry');
      } else if (shift.startsWith('temporal_shift')) {
        const direction = shift.split('_')[2];
        lines.push(`- Notable shift: orientation moved toward ${direction}`);
      }
    }
  }
  
  return lines.length > 0 ? lines.join('\n') : null;
}
