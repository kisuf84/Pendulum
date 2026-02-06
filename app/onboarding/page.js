'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useLanguage } from '../../lib/languageContext';

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({
    name: '',
    what_you_do: '',
    current_focus: '',
    influences: '',
    communication_style: 'warm'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClient();
  const { language, changeLanguage, t, languages } = useLanguage();

  // Get other languages (not currently selected)
  const otherLanguages = languages.filter(l => l.code !== language);

  // Define steps with translation keys
  const STEPS = [
    {
      id: 'intro',
      type: 'intro'
    },
    {
      id: 'name',
      questionKey: 'nameQuestion',
      placeholderKey: 'namePlaceholder',
      field: 'name'
    },
    {
      id: 'what_you_do',
      questionKey: 'whatYouDoQuestion',
      subtitleKey: 'whatYouDoSubtitle',
      placeholderKey: 'whatYouDoPlaceholder',
      field: 'what_you_do'
    },
    {
      id: 'current_focus',
      questionKey: 'currentFocusQuestion',
      subtitleKey: 'currentFocusSubtitle',
      placeholderKey: 'currentFocusPlaceholder',
      field: 'current_focus'
    },
    {
      id: 'influences',
      questionKey: 'influencesQuestion',
      subtitleKey: 'influencesSubtitle',
      placeholderKey: 'influencesPlaceholder',
      field: 'influences'
    },
    {
      id: 'communication_style',
      questionKey: 'communicationStyleQuestion',
      subtitleKey: 'communicationStyleSubtitle',
      field: 'communication_style',
      options: [
        { value: 'warm', labelKey: 'styleWarm', descKey: 'styleWarmDesc' },
        { value: 'direct', labelKey: 'styleDirect', descKey: 'styleDirectDesc' },
        { value: 'poetic', labelKey: 'stylePoetic', descKey: 'stylePoeticDesc' },
        { value: 'minimal', labelKey: 'styleMinimal', descKey: 'styleMinimalDesc' }
      ]
    },
    {
      id: 'ready',
      type: 'ready'
    }
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Check if already onboarded
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('user_id', user.id)
        .single();

      if (profile?.onboarding_complete) {
        router.push('/');
      }
    };

    checkUser();
  }, [router, supabase]);

  const step = STEPS[currentStep];
  const isIntro = step.type === 'intro';
  const isReady = step.type === 'ready';
  const isLastStep = currentStep === STEPS.length - 1;
  
  const canProceed = isIntro || isReady || step.options 
    ? true 
    : answers[step.field]?.trim().length > 0;

  const handleNext = async () => {
    if (isLastStep) {
      await saveProfile();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleInputChange = (value) => {
    setAnswers(prev => ({
      ...prev,
      [step.field]: value
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && canProceed) {
      e.preventDefault();
      handleNext();
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          name: answers.name,
          what_you_do: answers.what_you_do,
          current_focus: answers.current_focus,
          influences: answers.influences,
          communication_style: answers.communication_style,
          preferred_language: language,
          onboarding_complete: true
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      router.push('/');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Progress dots (excluding intro and ready screens)
  const progressSteps = STEPS.filter(s => !s.type);
  const currentProgressIndex = progressSteps.findIndex(s => s.id === step.id);

  return (
    <div className="app-container">
      {/* Language selector in top right */}
      <div className="language-selector">
        {otherLanguages.map(lang => (
          <button
            key={lang.code}
            className="language-flag"
            onClick={() => changeLanguage(lang.code)}
            title={lang.name}
          >
            {lang.flag}
          </button>
        ))}
      </div>

      <header className="header">
        <div className="logo">
          <div className="pendulum-icon" aria-hidden="true" />
        </div>
        <h1 className="title">Pendulum</h1>
        <p className="subtitle">{t('subtitle')}</p>
      </header>

      <main className="main-content onboarding-content">
        {/* Progress dots - only show for question steps */}
        {!isIntro && !isReady && (
          <div className="onboarding-progress">
            {progressSteps.map((_, idx) => (
              <div 
                key={idx} 
                className={`progress-dot ${idx === currentProgressIndex ? 'active' : ''} ${idx < currentProgressIndex ? 'complete' : ''}`}
              />
            ))}
          </div>
        )}

        {/* Intro Screen */}
        {isIntro && (
          <div className="onboarding-card intro-card">
            <p className="intro-greeting">{t('greeting')}</p>
            <p className="intro-text">
              {t('onboardingIntro1')}
            </p>
            <p className="intro-text">
              {t('onboardingIntro2')}
            </p>
            <p className="intro-text">
              {t('onboardingIntro3')}
            </p>
            <p className="intro-text">
              {t('onboardingIntro4')}
            </p>
            <p className="intro-text subtle">
              {t('onboardingIntro5')}
            </p>
            <div className="intro-action">
              <button className="submit-btn" onClick={handleNext}>
                <span>{t('letsStart')}</span>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Ready Screen */}
        {isReady && (
          <div className="onboarding-card intro-card">
            <p className="intro-greeting">{t('thankYou')}, {answers.name || 'friend'}.</p>
            <p className="intro-text">
              {t('readyIntro1')}
            </p>
            <p className="intro-text">
              {t('readyIntro2')}
            </p>
            <p className="intro-text subtle">
              {t('readyIntro3')}
            </p>
            <div className="intro-action">
              <button className="submit-btn" onClick={handleNext} disabled={isLoading}>
                <span>{isLoading ? t('preparing') : t('begin')}</span>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Question Steps */}
        {!isIntro && !isReady && (
          <div className="onboarding-card">
            <h2 className="onboarding-question">{t(step.questionKey)}</h2>
            {step.subtitleKey && (
              <p className="onboarding-subtitle">{t(step.subtitleKey)}</p>
            )}

            {step.options ? (
              <div className="style-options">
                {step.options.map(option => (
                  <button
                    key={option.value}
                    className={`style-option ${answers[step.field] === option.value ? 'selected' : ''}`}
                    onClick={() => handleInputChange(option.value)}
                  >
                    <span className="style-label">{t(option.labelKey)}</span>
                    <span className="style-desc">{t(option.descKey)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                className="onboarding-input"
                value={answers[step.field] || ''}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t(step.placeholderKey)}
                autoFocus
                rows={step.id === 'name' ? 1 : 3}
              />
            )}

            <div className="onboarding-actions">
              {currentStep > 1 && (
                <button className="back-btn" onClick={handleBack}>
                  {t('back')}
                </button>
              )}
              <button
                className="submit-btn"
                onClick={handleNext}
                disabled={!canProceed || isLoading}
              >
                <span>{t('continue')}</span>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p className="entry-count">
          {isIntro ? t('tagline') : t('shapesHow')}
        </p>
      </footer>
    </div>
  );
}
