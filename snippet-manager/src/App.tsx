import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import toast, { Toaster } from 'react-hot-toast';
import Select from 'react-select';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import TagInput from './components/TagInput';
import { SUPPORTED_LANGUAGES, THEMES } from './constants';
import './App.css';

interface Snippet {
  id: number;
  title: string;
  code: string;
  language: string;
  tags: string;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
}

function App() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState(THEMES[0]);
  const [languageFilter, setLanguageFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      const form = document.querySelector('form');
      if (form) {
        form.requestSubmit();
      }
    }

    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  const updateAllTags = useCallback((snippets: Snippet[]) => {
    const tagSet = new Set<string>();
    snippets.forEach(snippet => {
      const snippetTags = snippet.tags.split(',').map(t => t.trim()).filter(t => t);
      snippetTags.forEach(tag => tagSet.add(tag));
    });
    setAllTags(Array.from(tagSet));
  }, []);

  useEffect(() => {
    console.log('Initial load effect running');
    loadSnippets();
  }, []);

  useEffect(() => {
    document.body.classList.remove(...THEMES.map(t => t.value));
    document.body.classList.add(theme.value);
  }, [theme]);

  async function loadSnippets() {
    setIsLoading(true);
    try {
      console.log('Starting to load snippets...');
      if (!invoke) {
        console.error('invoke is undefined!');
        return;
      }
      const loadedSnippets = await invoke<Snippet[]>('get_snippets');
      console.log('Loaded snippets:', loadedSnippets);
      setSnippets(loadedSnippets);
      updateAllTags(loadedSnippets);
    } catch (error) {
      console.error('Detailed error:', error);
      toast.error('Failed to load snippets');
    } finally {
      setIsLoading(false);
    }
  }

  function handleEdit(snippet: Snippet) {
    setEditingId(snippet.id);
    setTitle(snippet.title);
    setCode(snippet.code);
    setLanguage(snippet.language);
    setTags(snippet.tags.split(',').map(t => t.trim()).filter(t => t));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const tagsString = tags.join(', ');
      if (editingId) {
        await invoke('update_snippet', {
          id: editingId,
          title,
          code,
          language,
          tags: tagsString,
        });
        toast.success('Snippet updated successfully');
      } else {
        await invoke('create_snippet', {
          title,
          code,
          language,
          tags: tagsString,
        });
        toast.success('Snippet created successfully');
      }
      
      handleCancelEdit();
      loadSnippets();
    } catch (error) {
      toast.error(editingId ? 'Failed to update snippet' : 'Failed to create snippet');
      console.error('Error saving snippet:', error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setTitle('');
    setCode('');
    setLanguage('');
    setTags([]);
  }

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const query = e.target.value;
    setSearchQuery(query);
    
    try {
      if (query.trim()) {
        const results = await invoke<Snippet[]>('search_snippets', { query });
        setSnippets(results);
      } else {
        loadSnippets();
      }
    } catch (error) {
      console.error('Error searching snippets:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this snippet?')) return;
    
    try {
      await invoke('delete_snippet', { id });
      toast.success('Snippet deleted successfully');
      loadSnippets();
    } catch (error) {
      toast.error('Failed to delete snippet');
      console.error('Error deleting snippet:', error);
    }
  }

  async function copyToClipboard(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
      console.error('Error copying to clipboard:', error);
    }
  }

  const filteredSnippets = useMemo(() => {
    return snippets.filter(snippet => {
      if (showFavoritesOnly && !snippet.is_favorite) {
        return false;
      }

      if (languageFilter && snippet.language !== languageFilter) {
        return false;
      }

      if (tagFilter.length > 0) {
        const snippetTags = snippet.tags.split(',').map(t => t.trim());
        if (!tagFilter.every(tag => snippetTags.includes(tag))) {
          return false;
        }
      }

      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return (
          snippet.title.toLowerCase().includes(searchLower) ||
          snippet.code.toLowerCase().includes(searchLower) ||
          snippet.tags.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [snippets, languageFilter, tagFilter, showFavoritesOnly, searchQuery]);

  async function handleToggleFavorite(id: number) {
    try {
      const newStatus = await invoke<boolean>('toggle_favorite', { id });
      setSnippets(snippets.map(snippet => 
        snippet.id === id 
          ? { ...snippet, is_favorite: newStatus }
          : snippet
      ));
      toast.success(newStatus ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      toast.error('Failed to update favorite status');
      console.error('Error toggling favorite:', error);
    }
  }

  const renderCodeBlock = useCallback((code: string, language: string) => {
    return (
      <div className="code-wrapper">
        <SyntaxHighlighter 
          language={language.toLowerCase()} 
          style={tomorrow}
          customStyle={{
            margin: '0',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: "'Cascadia Code', monospace"
          }}
        >
          {code}
        </SyntaxHighlighter>
        <button 
          className="copy-button"
          onClick={() => copyToClipboard(code)}
          title="Copy to clipboard"
        >
          Copy
        </button>
      </div>
    );
  }, []);

  return (
    <div className="container">
      <Toaster position="top-right" />
      <div className="header">
        <h1>Snippet Manager</h1>
        <div className="theme-selector">
          <Select
            options={THEMES}
            value={theme}
            onChange={(newTheme) => setTheme(newTheme || THEMES[0])}
            className="theme-select"
            classNamePrefix="theme-select"
          />
        </div>
      </div>

      <div className="filters">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>

        <div className="filter-options">
          <Select
            options={SUPPORTED_LANGUAGES}
            value={SUPPORTED_LANGUAGES.find(l => l.value === languageFilter)}
            onChange={(newValue) => setLanguageFilter(newValue?.value || '')}
            className="language-filter"
            classNamePrefix="language-filter"
            placeholder="Filter by language..."
            isClearable
          />

          <TagInput
            value={tagFilter}
            onChange={setTagFilter}
            suggestions={allTags}
            placeholder="Filter by tags..."
          />

          <label className="favorite-filter">
            <input
              type="checkbox"
              checked={showFavoritesOnly}
              onChange={(e) => setShowFavoritesOnly(e.target.checked)}
            />
            Show favorites only
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <h2>{editingId ? 'Edit Snippet' : 'Create New Snippet'}</h2>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="code">Code</label>
          <textarea
            id="code"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="language">Language</label>
          <Select
            options={SUPPORTED_LANGUAGES}
            value={SUPPORTED_LANGUAGES.find(l => l.value === language)}
            onChange={(newValue) => setLanguage(newValue?.value || '')}
            className="language-select"
            classNamePrefix="language-select"
            placeholder="Select a language..."
          />
        </div>

        <div className="form-group">
          <label>Tags</label>
          <TagInput
            value={tags}
            onChange={setTags}
            suggestions={allTags}
          />
        </div>

        <div className="form-buttons">
          <button 
            type="submit" 
            disabled={isSaving}
            className={isSaving ? 'loading' : ''}
          >
            {isSaving ? 'Saving...' : (editingId ? 'Update Snippet' : 'Save Snippet')}
          </button>
          {editingId && (
            <button 
              type="button" 
              onClick={handleCancelEdit} 
              className="cancel"
              disabled={isSaving}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="snippets-list">
        {isLoading ? (
          <div className="loading-spinner">Loading snippets...</div>
        ) : filteredSnippets.length === 0 ? (
          <div className="empty-state">
            No snippets found. Create your first snippet!
          </div>
        ) : (
          filteredSnippets.map((snippet) => (
            <div key={snippet.id} className="snippet-card">
              <div className="snippet-header">
                <h3>{snippet.title}</h3>
                <button
                  className={`favorite-button ${snippet.is_favorite ? 'active' : ''}`}
                  onClick={() => handleToggleFavorite(snippet.id)}
                  title={snippet.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  ★
                </button>
              </div>
              {renderCodeBlock(snippet.code, snippet.language)}
              <div className="snippet-meta">
                <span>Language: {snippet.language}</span>
                <span>Tags: {snippet.tags}</span>
              </div>
              <div className="actions">
                <button onClick={() => handleEdit(snippet)}>
                  Edit
                </button>
                <button 
                  className="delete" 
                  onClick={() => handleDelete(snippet.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
