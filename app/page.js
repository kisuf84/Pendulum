'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { useLanguage } from '../lib/languageContext';
import { getTranslation } from '../lib/translations';

export default function Pendulum() {
  const [entry, setEntry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [mode, setMode] = useState('write');
  const [reviewingEntry, setReviewingEntry] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [morningEcho, setMorningEcho] = useState(null);
  const [showEcho, setShowEcho] = useState(false);
  const [weeklySynthesis, setWeeklySynthesis] = useState(null);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [isDreamMode, setIsDreamMode] = useState(false);
  const [anchorFeedback, setAnchorFeedback] = useState(null);
  const [anchorSelection, setAnchorSelection] = useState(null); // { text, x, y, entryId }
  const textareaRef = useRef(null);
  const longPressTimer = useRef(null);
  const router = useRouter();
  const supabase = createClient();
  const { language } = useLanguage();
  
  // Translation helper
  const t = (key) => getTranslation(language, key);

  // Fetch weather and location
  useEffect(() => {
    const fetchWeatherAndLocation = async () => {
      // Get location from browser
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
              // Get weather from Open-Meteo (free, no API key needed)
              const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
              );
              const weatherData = await weatherRes.json();
              
              if (weatherData.current) {
                const temp = Math.round(weatherData.current.temperature_2m);
                const code = weatherData.current.weather_code;
                const condition = getWeatherCondition(code);
                setWeather({ temp: `${temp}°C`, condition });
              }

              // Reverse geocode for city name
              const geoRes = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
              );
              const geoData = await geoRes.json();
              
              if (geoData.city || geoData.locality) {
                setLocation({
                  city: geoData.city || geoData.locality,
                  country: geoData.countryName
                });
              }
            } catch (err) {
              console.log('Weather/location fetch failed:', err);
              // Continue without weather, not critical
            }
          },
          (err) => {
            console.log('Geolocation denied or unavailable:', err);
            // Continue without location
          }
        );
      }
    };

    fetchWeatherAndLocation();
  }, []);

  // Convert weather code to condition
  const getWeatherCondition = (code) => {
    if (code === 0) return 'clear';
    if (code <= 3) return 'partly cloudy';
    if (code <= 49) return 'foggy';
    if (code <= 59) return 'drizzle';
    if (code <= 69) return 'rain';
    if (code <= 79) return 'snow';
    if (code <= 99) return 'storm';
    return 'cloudy';
  };

  // Check authentication and onboarding status
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (!user) {
        setIsCheckingAuth(false);
        router.push('/login');
        return;
      }

      // Check if user has completed onboarding
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile || !profile.onboarding_complete) {
        router.push('/onboarding');
        return;
      }

      setUserProfile(profile);
      setIsCheckingAuth(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  // Load entries and check for morning echo and weekly synthesis
  useEffect(() => {
    const loadEntries = async () => {
      if (!user) return;
      
      setIsLoadingEntries(true);
      
      // Load entries
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to load entries:', error);
      } else {
        setEntries(data || []);
      }

      // Check for unshown morning echo
      const { data: echoData } = await supabase
        .from('morning_echoes')
        .select('*')
        .eq('user_id', user.id)
        .eq('shown', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (echoData && echoData.length > 0) {
        const echo = echoData[0];
        const echoDate = new Date(echo.created_at);
        const now = new Date();
        const hoursSinceEcho = (now - echoDate) / (1000 * 60 * 60);
        
        // Show echo if it's morning (6am-12pm) and echo was created last night
        const currentHour = now.getHours();
        if (currentHour >= 6 && currentHour < 14 && hoursSinceEcho >= 4) {
          setMorningEcho(echo);
          setShowEcho(true);
        }
      }

      // Check for weekly synthesis (Sunday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      console.log('Synthesis check - Day of week:', dayOfWeek, '(0 = Sunday)');
      console.log('Synthesis check - Total entries:', data?.length || 0);
      
      if (dayOfWeek === 0) { // Sunday
        // Check if we already have a synthesis for this week
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        
        const { data: existingSynthesis, error: synthError } = await supabase
          .from('weekly_syntheses')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', weekStart.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('Synthesis check - Existing synthesis:', existingSynthesis);
        console.log('Synthesis check - Query error:', synthError);

        if (existingSynthesis && existingSynthesis.length > 0) {
          // Show existing synthesis if not dismissed
          console.log('Synthesis check - Dismissed status:', existingSynthesis[0].dismissed);
          if (!existingSynthesis[0].dismissed) {
            setWeeklySynthesis(existingSynthesis[0]);
            setShowSynthesis(true);
          }
        } else if (data && data.length >= 2) {
          // Generate new synthesis if we have entries
          console.log('Synthesis check - Generating new synthesis...');
          try {
            const synthRes = await fetch('/api/synthesis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                userProfile: userProfile
              })
            });
            const synthData = await synthRes.json();
            console.log('Synthesis check - API response:', synthData);
            if (synthData.synthesis) {
              setWeeklySynthesis({ synthesis_text: synthData.synthesis });
              setShowSynthesis(true);
            }
          } catch (err) {
            console.error('Synthesis generation failed:', err);
          }
        } else {
          console.log('Synthesis check - Not enough entries (need >= 2)');
        }
      }
      
      setIsLoadingEntries(false);
    };

    if (user && !isCheckingAuth) {
      loadEntries();
    }
  }, [user, isCheckingAuth, supabase, userProfile]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(200, textareaRef.current.scrollHeight) + 'px';
    }
  }, [entry]);

  // Calculate days since last entry
  const getDaysSinceLastEntry = () => {
    if (entries.length === 0) return null;
    const lastEntry = entries[entries.length - 1];
    const lastDate = new Date(lastEntry.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get entry age in days
  const getEntryAgeDays = (timestamp) => {
    const entryDate = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - entryDate);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get opacity based on entry age (visual decay)
  const getDecayOpacity = (timestamp) => {
    const days = getEntryAgeDays(timestamp);
    if (days === 0) return 1;
    if (days <= 7) return 0.9;
    if (days <= 30) return 0.7;
    if (days <= 90) return 0.5;
    return 0.35;
  };

  // Fragment text based on age (the real letting go feature)
  const fragmentText = (text, timestamp) => {
    const days = getEntryAgeDays(timestamp);
    
    // No fragmentation for recent entries
    if (days <= 30) return text;
    
    // Light fragmentation: 30-90 days
    if (days <= 90) {
      return text.split(' ').map((word, i) => {
        // Randomly fade some words (about 10%)
        if (Math.random() < 0.1 && word.length > 3) {
          return '···';
        }
        return word;
      }).join(' ');
    }
    
    // Medium fragmentation: 90-180 days
    if (days <= 180) {
      return text.split(' ').map((word, i) => {
        // Fade about 25% of words
        if (Math.random() < 0.25 && word.length > 2) {
          return '···';
        }
        return word;
      }).join(' ');
    }
    
    // Heavy fragmentation: 180+ days
    return text.split(' ').map((word, i) => {
      // Fade about 40% of words
      if (Math.random() < 0.4 && word.length > 2) {
        return '···';
      }
      // Partially obscure some remaining words
      if (Math.random() < 0.15 && word.length > 4) {
        return word.slice(0, 2) + '··';
      }
      return word;
    }).join(' ');
  };

  // Memoize fragmented text to prevent re-randomization on re-render
  const [fragmentedTexts, setFragmentedTexts] = useState({});
  
  const getFragmentedText = (id, text, timestamp) => {
    if (!fragmentedTexts[id]) {
      setFragmentedTexts(prev => ({
        ...prev,
        [id]: fragmentText(text, timestamp)
      }));
      return fragmentText(text, timestamp);
    }
    return fragmentedTexts[id];
  };

  // Auto-detect dream entries
  const detectDreamEntry = (text) => {
    const dreamPatterns = [
      /\bi dreamed\b/i,
      /\bi had a dream\b/i,
      /\bin my dream\b/i,
      /\bwas dreaming\b/i,
      /\bdream last night\b/i,
      /\bwoke up from\b/i,
      /\bin the dream\b/i,
      /\bthen i woke\b/i,
      /\bwhile sleeping\b/i,
      /\bnightmare\b/i
    ];
    return dreamPatterns.some(pattern => pattern.test(text));
  };

  const handleSubmit = async () => {
    if (!entry.trim() || isLoading || !user) return;

    setIsLoading(true);
    setError(null);

    const daysSinceLastEntry = getDaysSinceLastEntry();
    
    // Detect if this is a dream entry (manual toggle OR auto-detect)
    const dreamEntry = isDreamMode || detectDreamEntry(entry);

    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry: entry.trim(),
          previousEntries: entries.slice(-10).map(e => ({
            entry: e.entry_text,
            timestamp: e.created_at
          })),
          daysSinceLastEntry: daysSinceLastEntry,
          timeOfDay: new Date().getHours(),
          userProfile: userProfile,
          weather: weather,
          location: location,
          isDream: dreamEntry,
          language: language
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Save entry to Supabase (with dream flag)
      const { data: newEntry, error: insertError } = await supabase
        .from('entries')
        .insert({
          user_id: user.id,
          entry_text: entry.trim(),
          reflection: data.response,
          is_dream: dreamEntry
        })
        .select()
        .single();

      if (insertError) throw new Error('Failed to save entry');

      // Save morning echo if generated
      if (data.morningEcho) {
        await supabase
          .from('morning_echoes')
          .insert({
            user_id: user.id,
            entry_id: newEntry.id,
            echo_text: data.morningEcho,
            shown: false
          });
      }

      setEntries(prev => [...prev, newEntry]);
      setResponse(data.response);
      setMode('response');
      setEntry('');
      setIsDreamMode(false); // Reset dream mode toggle

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const dismissEcho = async () => {
    if (morningEcho) {
      await supabase
        .from('morning_echoes')
        .update({ shown: true })
        .eq('id', morningEcho.id);
    }
    setShowEcho(false);
    setMorningEcho(null);
  };

  const dismissSynthesis = async () => {
    if (weeklySynthesis?.id) {
      await supabase
        .from('weekly_syntheses')
        .update({ dismissed: true })
        .eq('id', weeklySynthesis.id);
    }
    setShowSynthesis(false);
    setWeeklySynthesis(null);
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const startNewEntry = () => {
    setMode('write');
    setResponse(null);
    setReviewingEntry(null);
    setEntry('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const continueConversation = () => {
    setMode('continue');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const openEntryReview = (entryData) => {
    setReviewingEntry(entryData);
    setMode('review');
    setShowHistory(false);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t('goodMorning');    // 5 AM - 11:59 AM
    if (hour >= 12 && hour < 17) return t('goodAfternoon'); // 12 PM - 4:59 PM
    if (hour >= 17 && hour < 21) return t('goodEvening');   // 5 PM - 8:59 PM
    return t('lateNight');                                   // 9 PM - 4:59 AM
  };

  const getPlaceholder = () => {
    if (mode === 'continue') {
      return t('continueThought');
    }
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 5) {
      return t('whatMovingTonight');
    }
    return t('whatPresent');
  };

  // Anchor saving functionality
  const saveAnchor = async (text, entryId = null) => {
    if (!user || !text.trim()) return;

    try {
      const { error } = await supabase
        .from('anchors')
        .insert({
          user_id: user.id,
          anchor_text: text.trim(),
          source_entry_id: entryId
        });

      if (!error) {
        setAnchorFeedback(t('anchored'));
        setTimeout(() => setAnchorFeedback(null), 1500);
        window.getSelection().removeAllRanges();
        setAnchorSelection(null);
      } else {
        console.error('Anchor save error:', error);
      }
    } catch (err) {
      console.error('Failed to save anchor:', err);
    }
  };

  const handleTextSelect = (entryId = null) => {
    setTimeout(() => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 10 && selectedText.length < 500) {
        // Get position for floating button
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        setAnchorSelection({
          text: selectedText,
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
          entryId
        });
      } else {
        setAnchorSelection(null);
      }
    }, 10);
  };

  const confirmAnchor = () => {
    if (anchorSelection) {
      saveAnchor(anchorSelection.text, anchorSelection.entryId);
    }
  };

  const cancelAnchor = () => {
    window.getSelection().removeAllRanges();
    setAnchorSelection(null);
  };

  // Close anchor popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (anchorSelection && !e.target.closest('.anchor-popup')) {
        setAnchorSelection(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [anchorSelection]);

  const reversedEntries = [...entries].reverse();

  if (isCheckingAuth) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="loading-pendulum" />
          <span>{t('awakening')}</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="pendulum-icon" aria-hidden="true" />
        </div>
        <h1 className="title">Pendulum</h1>
        <p className="subtitle">{t('subtitle')}</p>
        
        {/* Navigation icons */}
        <div className="header-nav">
          <button 
            className="header-nav-btn"
            onClick={() => router.push('/anchors')}
            title={t('anchors')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="5" r="3" />
              <line x1="12" y1="8" x2="12" y2="21" />
              <path d="M5 12h14" />
              <path d="M5 12a7 7 0 0 0 7 9 7 7 0 0 0 7-9" />
            </svg>
          </button>
          <button 
            className="header-nav-btn"
            onClick={() => router.push('/settings')}
            title={t('settings')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </button>
        </div>
      </header>

      {/* Anchor feedback toast */}
      {anchorFeedback && (
        <div className="anchor-toast">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="3" />
            <line x1="12" y1="8" x2="12" y2="21" />
            <path d="M5 12h14" />
            <path d="M5 12a7 7 0 0 0 7 9 7 7 0 0 0 7-9" />
          </svg>
          <span>{t('anchored')}</span>
        </div>
      )}

      {/* Floating anchor popup */}
      {anchorSelection && (
        <div 
          className="anchor-popup"
          style={{
            position: 'fixed',
            left: `${Math.min(Math.max(anchorSelection.x, 60), window.innerWidth - 60)}px`,
            top: `${Math.max(anchorSelection.y - 50, 10)}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <button className="anchor-popup-btn" onClick={confirmAnchor}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="3" />
              <line x1="12" y1="8" x2="12" y2="21" />
              <path d="M5 12h14" />
              <path d="M5 12a7 7 0 0 0 7 9 7 7 0 0 0 7-9" />
            </svg>
            <span>{t('anchors')}</span>
          </button>
        </div>
      )}

      {/* Morning Echo */}
      {showEcho && morningEcho && (
        <div className="echo-overlay">
          <div className="echo-card">
            <div className="echo-label">{t('morningEcho')}</div>
            <p className="echo-text">{morningEcho.echo_text}</p>
            <button className="echo-dismiss" onClick={dismissEcho}>
              {t('continueToWrite')}
            </button>
          </div>
        </div>
      )}

      {/* Weekly Synthesis */}
      {showSynthesis && weeklySynthesis && !showEcho && (
        <div className="echo-overlay">
          <div className="echo-card synthesis-card">
            <div className="echo-label">{t('yourWeek')}</div>
            <p className="echo-text">{weeklySynthesis.synthesis_text}</p>
            <button className="echo-dismiss" onClick={dismissSynthesis}>
              {t('continueToWrite')}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {/* Writing Section */}
        {(mode === 'write' || mode === 'continue') && !showEcho && !showSynthesis && (
          <section className="writing-section">
            <label className="section-label" htmlFor="entry">
              {mode === 'continue' ? t('continueThread') : getGreeting()}
              {userProfile?.name ? `, ${userProfile.name}` : ''}
            </label>
            <div className="textarea-wrapper">
              <textarea
                ref={textareaRef}
                id="entry"
                className="textarea"
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={getPlaceholder()}
                disabled={isLoading}
                autoFocus
              />
              <div className="textarea-footer">
                <button 
                  className={`dream-toggle ${isDreamMode ? 'active' : ''}`}
                  onClick={() => setIsDreamMode(!isDreamMode)}
                  title={isDreamMode ? t('dreamModeOn') : t('recordDream')}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                  {isDreamMode && <span>{t('dreamMode')}</span>}
                </button>
                <span className="char-count">
                  {entry.length > 0 ? `${entry.length} ${t('chars')}` : ''}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Submit Button */}
        {(mode === 'write' || mode === 'continue') && !isLoading && !showEcho && (
          <div className="submit-section">
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!entry.trim() || isLoading}
            >
              <span>{t('reflect')}</span>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="loading">
            <div className="loading-pendulum" />
            <span>{t('reflecting')}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Response Section */}
        {mode === 'response' && response && (
          <section className="response-section">
            <div className="response-card">
              <div 
                className="response-content anchorable"
                onMouseUp={() => handleTextSelect(null)}
                onTouchEnd={() => handleTextSelect(null)}
              >
                {response.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
              <p className="anchor-hint">{t('selectToAnchor')}</p>
              <div className="continue-section">
                <button className="continue-btn" onClick={continueConversation}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>{t('continueThisThread')}</span>
                </button>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
              <button className="new-entry-btn" onClick={startNewEntry}>
                {t('newEntry')}
              </button>
            </div>
          </section>
        )}

        {/* Review Mode */}
        {mode === 'review' && reviewingEntry && (
          <section className="review-section">
            <div className="review-header">
              <button className="back-btn" onClick={startNewEntry}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span>{t('back')}</span>
              </button>
              <span className="review-date">{formatDate(reviewingEntry.created_at)}</span>
            </div>
            
            <div className="review-entry-card" style={{ opacity: getDecayOpacity(reviewingEntry.created_at) }}>
              <div className="review-label">{t('yourEntry')}</div>
              <div className="review-entry-text fragmented">
                {getEntryAgeDays(reviewingEntry.created_at) > 30 
                  ? getFragmentedText(reviewingEntry.id + '_entry', reviewingEntry.entry_text, reviewingEntry.created_at)
                  : reviewingEntry.entry_text
                }
              </div>
              {getEntryAgeDays(reviewingEntry.created_at) > 30 && (
                <div className="decay-note">{t('decayNote')}</div>
              )}
            </div>

            <div className="review-response-card" style={{ opacity: getDecayOpacity(reviewingEntry.created_at) }}>
              <div className="review-label">{t('pendulumReflection')}</div>
              <div 
                className="response-content fragmented anchorable"
                onMouseUp={() => handleTextSelect(reviewingEntry.id)}
                onTouchEnd={() => handleTextSelect(reviewingEntry.id)}
              >
                {getEntryAgeDays(reviewingEntry.created_at) > 30 
                  ? getFragmentedText(reviewingEntry.id + '_reflection', reviewingEntry.reflection, reviewingEntry.created_at).split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))
                  : reviewingEntry.reflection.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))
                }
              </div>
              <p className="anchor-hint">{t('selectToAnchor')}</p>
            </div>
          </section>
        )}

        {/* History Section with Decay */}
        {entries.length > 0 && (mode === 'write' || mode === 'continue') && !isLoadingEntries && !showEcho && (
          <div className="history-section">
            <button 
              className="history-toggle"
              onClick={() => setShowHistory(!showHistory)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d={showHistory ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
              </svg>
              <span>{entries.length} {entries.length === 1 ? t('entry') : t('entries')}</span>
            </button>
            
            {showHistory && (
              <div className="history-list">
                {reversedEntries.map((e) => (
                  <div 
                    key={e.id} 
                    className="history-entry clickable"
                    style={{ opacity: getDecayOpacity(e.created_at) }}
                    onClick={() => openEntryReview(e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => ev.key === 'Enter' && openEntryReview(e)}
                  >
                    <div className="history-entry-header">
                      <span className="history-date">{formatDate(e.created_at)}</span>
                      <svg className="history-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                    <div className="history-text">
                      {getEntryAgeDays(e.created_at) > 30
                        ? getFragmentedText(e.id + '_preview', e.entry_text.slice(0, 120), e.created_at) + (e.entry_text.length > 120 ? '...' : '')
                        : (e.entry_text.length > 120 ? e.entry_text.slice(0, 120) + '...' : e.entry_text)
                      }
                    </div>
                    {e.reflection && (
                      <div className="history-response-preview">
                        <span className="history-response-label">{t('reflection')}:</span>
                        {' '}
                        {e.reflection.length > 80 ? e.reflection.slice(0, 80) + '...' : e.reflection}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoadingEntries && (
          <div className="loading">
            <div className="loading-pendulum" />
            <span>Loading your reflections...</span>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p className="entry-count">
          {entries.length === 0 
            ? 'Begin your first entry' 
            : `${entries.length} ${entries.length === 1 ? 'reflection' : 'reflections'} recorded`
          }
        </p>
        <div className="footer-links">
          <button className="footer-link" onClick={() => router.push('/settings')}>
            Settings
          </button>
          <span className="footer-divider">·</span>
          <button className="footer-link" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </footer>
    </div>
  );
}
