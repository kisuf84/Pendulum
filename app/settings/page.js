'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useLanguage } from '../../lib/languageContext';
import { getTranslation } from '../../lib/translations';

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: '',
    what_you_do: '',
    current_focus: '',
    influences: '',
    communication_style: 'warm'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClient();
  const { language, changeLanguage, languages } = useLanguage();
  const t = (key) => getTranslation(language, key);

  // Style options with translations
  const getStyleOptions = () => [
    { value: 'warm', label: t('styleWarm'), desc: t('styleWarmDesc') },
    { value: 'direct', label: t('styleDirect'), desc: t('styleDirectDesc') },
    { value: 'poetic', label: t('stylePoetic'), desc: t('stylePoeticDesc') },
    { value: 'minimal', label: t('styleMinimal'), desc: t('styleMinimalDesc') }
  ];

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        setProfile({
          name: existingProfile.name || '',
          what_you_do: existingProfile.what_you_do || '',
          current_focus: existingProfile.current_focus || '',
          influences: existingProfile.influences || '',
          communication_style: existingProfile.communication_style || 'warm'
        });
      }

      setIsLoading(false);
    };

    loadProfile();
  }, [router, supabase]);

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaveMessage(null);
  };

  const handleLanguageChange = (langCode) => {
    changeLanguage(langCode);
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          name: profile.name,
          what_you_do: profile.what_you_do,
          current_focus: profile.current_focus,
          influences: profile.influences,
          communication_style: profile.communication_style,
          preferred_language: language,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSaveMessage(t('saved'));
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveMessage('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="loading-pendulum" />
          <span>{t('awakening')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo">
          <div className="pendulum-icon" aria-hidden="true" />
        </div>
        <h1 className="title">Pendulum</h1>
        <p className="subtitle">{t('subtitle')}</p>
      </header>

      <main className="main-content settings-content">
        <div className="settings-header">
          <button className="back-btn" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>{t('back')}</span>
          </button>
          <h2 className="settings-title">{t('settingsTitle')}</h2>
        </div>

        {/* How Pendulum Works - FIRST */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('howPendulumWorks')}</h3>
          <p className="settings-section-desc">
            {t('howPendulumWorksDesc')}
          </p>

          <div className="ethics-list">
            <div className="ethics-item">
              <span className="ethics-icon">○</span>
              <span className="ethics-text">{t('ethic1')}</span>
            </div>
            <div className="ethics-item">
              <span className="ethics-icon">○</span>
              <span className="ethics-text">{t('ethic2')}</span>
            </div>
            <div className="ethics-item">
              <span className="ethics-icon">○</span>
              <span className="ethics-text">{t('ethic3')}</span>
            </div>
            <div className="ethics-item">
              <span className="ethics-icon">○</span>
              <span className="ethics-text">{t('ethic4')}</span>
            </div>
            <div className="ethics-item">
              <span className="ethics-icon">○</span>
              <span className="ethics-text">{t('ethic5')}</span>
            </div>
            <div className="ethics-item">
              <span className="ethics-icon">○</span>
              <span className="ethics-text">{t('ethic6')}</span>
            </div>
          </div>
        </div>

        {/* Your Seed - SECOND */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('yourSeed')}</h3>
          <p className="settings-section-desc">
            {t('seedDescription')}
          </p>

          <div className="settings-field">
            <label className="settings-label">{t('name')}</label>
            <input
              type="text"
              className="settings-input"
              value={profile.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">{t('whatYouDo')}</label>
            <textarea
              className="settings-textarea"
              value={profile.what_you_do}
              onChange={(e) => handleChange('what_you_do', e.target.value)}
              placeholder={t('whatYouDoPlaceholder')}
              rows={3}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">{t('currentFocus')}</label>
            <textarea
              className="settings-textarea"
              value={profile.current_focus}
              onChange={(e) => handleChange('current_focus', e.target.value)}
              placeholder={t('currentFocusPlaceholder')}
              rows={3}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">{t('influences')}</label>
            <textarea
              className="settings-textarea"
              value={profile.influences}
              onChange={(e) => handleChange('influences', e.target.value)}
              placeholder={t('influencesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        {/* Voice */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('voice')}</h3>
          <p className="settings-section-desc">
            {t('voiceDescription')}
          </p>

          <div className="style-options">
            {getStyleOptions().map(option => (
              <button
                key={option.value}
                className={`style-option ${profile.communication_style === option.value ? 'selected' : ''}`}
                onClick={() => handleChange('communication_style', option.value)}
              >
                <span className="style-label">{option.label}</span>
                <span className="style-desc">{option.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t('language')}</h3>
          <p className="settings-section-desc">
            {t('languageDescription')}
          </p>

          <div className="language-options">
            {languages.map(lang => (
              <button
                key={lang.code}
                className={`language-option ${language === lang.code ? 'selected' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                <span className="language-flag-large">{lang.flag}</span>
                <span className="language-name">{lang.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-actions">
          <button
            className="submit-btn"
            onClick={handleSave}
            disabled={isSaving}
          >
            <span>{isSaving ? t('saving') : t('saveChanges')}</span>
          </button>
          {saveMessage && (
            <span className={`save-message ${saveMessage === t('saved') ? 'success' : 'error'}`}>
              {saveMessage}
            </span>
          )}
        </div>
      </main>

      <footer className="footer">
        <p className="entry-count">{t('seedShapes')}</p>
      </footer>
    </div>
  );
}
