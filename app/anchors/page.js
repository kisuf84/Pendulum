'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useLanguage } from '../../lib/languageContext';
import { getTranslation } from '../../lib/translations';

export default function AnchorsPage() {
  const [anchors, setAnchors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [newAnchorText, setNewAnchorText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { language } = useLanguage();
  const t = (key) => getTranslation(language, key);

  useEffect(() => {
    const loadAnchors = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);

      const { data: userAnchors, error } = await supabase
        .from('anchors')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && userAnchors) {
        setAnchors(userAnchors);
      }

      setIsLoading(false);
    };

    loadAnchors();
  }, [router, supabase]);

  const handleBack = () => {
    router.push('/');
  };

  const handleDelete = async (anchorId) => {
    const { error } = await supabase
      .from('anchors')
      .delete()
      .eq('id', anchorId);

    if (!error) {
      setAnchors(prev => prev.filter(a => a.id !== anchorId));
    }
  };

  const handleAddAnchor = async () => {
    if (!user || !newAnchorText.trim()) return;

    setIsAdding(true);
    try {
      const { data, error } = await supabase
        .from('anchors')
        .insert({
          user_id: user.id,
          anchor_text: newAnchorText.trim(),
          source_entry_id: null
        })
        .select()
        .single();

      if (!error && data) {
        setAnchors(prev => [data, ...prev]);
        setNewAnchorText('');
      }
    } catch (err) {
      console.error('Failed to add anchor:', err);
    } finally {
      setIsAdding(false);
    }
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

      <main className="main-content anchors-content">
        <div className="settings-header">
          <button className="back-btn" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>{t('back')}</span>
          </button>
          <h2 className="settings-title">{t('anchors')}</h2>
        </div>

        {/* Add new anchor */}
        <div className="anchor-add-section">
          <textarea
            className="anchor-add-input"
            value={newAnchorText}
            onChange={(e) => setNewAnchorText(e.target.value)}
            placeholder={t('addAnchorPlaceholder')}
            rows={2}
          />
          <button 
            className="anchor-add-btn"
            onClick={handleAddAnchor}
            disabled={!newAnchorText.trim() || isAdding}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>{t('addAnchor')}</span>
          </button>
        </div>

        {anchors.length === 0 ? (
          <div className="anchors-empty">
            <div className="anchor-icon-large">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1">
                <circle cx="12" cy="5" r="3" />
                <line x1="12" y1="8" x2="12" y2="21" />
                <path d="M5 12h14" />
                <path d="M5 12a7 7 0 0 0 7 9 7 7 0 0 0 7-9" />
              </svg>
            </div>
            <p className="anchors-empty-title">{t('nothingAnchored')}</p>
            <p className="anchors-empty-desc">
              {t('anchorInstruction')}
            </p>
            <p className="anchors-empty-sub">
              {t('thingsIReturnTo')}
            </p>
          </div>
        ) : (
          <div className="anchors-list">
            {anchors.map((anchor) => (
              <div key={anchor.id} className="anchor-item">
                <p className="anchor-text">"{anchor.anchor_text}"</p>
                <button 
                  className="anchor-delete"
                  onClick={() => handleDelete(anchor.id)}
                  title={t('releaseAnchor')}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <p className="entry-count">{t('wordsToReturn')}</p>
      </footer>
    </div>
  );
}
