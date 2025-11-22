import { useState } from 'react'
import './App.css'

function App() {
  const [page, setPage] = useState('home')
  const [selectedTag, setSelectedTag] = useState(null)
  const [extractedNames, setExtractedNames] = useState([])
  const [linkedinUrls, setLinkedinUrls] = useState({})
  const [results, setResults] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [preview, setPreview] = useState(null)

  const tags = [
    {
      value: 'companies',
      label: 'Companies',
      desc: 'Find company pages from logos & names',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M3 7v14m6-14v14m6-14v14m6-14v14M6 11h.01M6 15h.01M12 11h.01M12 15h.01M18 11h.01M18 15h.01M4 3h16a1 1 0 0 1 1 1v3H3V4a1 1 0 0 1 1-1z"/>
        </svg>
      )
    },
    {
      value: 'people',
      label: 'People',
      desc: 'Find profiles from photos & names',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
        </svg>
      )
    }
  ]

  const handleTagSelect = (tagValue) => {
    setSelectedTag(tagValue)
    setPage('upload')
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    setIsProcessing(true)
    setResults([])
    setExtractedNames([])
    setStatusMessage(selectedTag === 'companies'
      ? 'Analyzing image for company names & logos...'
      : 'Analyzing image for person names & faces...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tag', selectedTag)

      const response = await fetch('http://localhost:8000/api/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('OCR failed')

      const data = await response.json()
      setExtractedNames(data.names)
      setLinkedinUrls(data.linkedin_urls || {})
      setStatusMessage(`Identified ${data.names.length} ${selectedTag === 'companies' ? 'compan' : 'person'}${data.names.length !== 1 ? (selectedTag === 'companies' ? 'ies' : 's') : (selectedTag === 'companies' ? 'y' : '')}`)
    } catch (error) {
      console.error('OCR Error:', error)
      setStatusMessage('Failed to process image. Please ensure the backend server is running.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSearch = async () => {
    if (extractedNames.length === 0) return

    setIsSearching(true)
    setStatusMessage('Finding LinkedIn profiles...')

    try {
      // Check if we have pre-fetched URLs from Groq
      const hasPreFetchedUrls = Object.keys(linkedinUrls).length > 0

      if (hasPreFetchedUrls) {
        // Use pre-fetched URLs - no search fallback, only exact matches or "No Match"
        const resultsFromGroq = extractedNames.map(name => ({
          name,
          linkedinUrl: linkedinUrls[name] || null,
          isExactMatch: !!linkedinUrls[name],
          profileTitle: linkedinUrls[name] ? `${name} | LinkedIn` : null
        }))

        setResults(resultsFromGroq)
        setPage('results')
        const exactMatches = resultsFromGroq.filter(r => r.isExactMatch).length
        const noMatches = resultsFromGroq.filter(r => !r.isExactMatch).length
        setStatusMessage(`Found ${exactMatches} exact match${exactMatches !== 1 ? 'es' : ''}${noMatches > 0 ? `, ${noMatches} not found` : ''}`)
      } else {
        // Fallback to search API
        const response = await fetch('http://localhost:8000/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            names: extractedNames,
            tag: selectedTag,
          }),
        })

        if (!response.ok) throw new Error('Search failed')

        const data = await response.json()
        setResults(data.results)
        setPage('results')
        const exactMatches = data.results.filter(r => r.isExactMatch).length
        setStatusMessage(`Found ${exactMatches} exact match${exactMatches !== 1 ? 'es' : ''} out of ${data.results.length} profiles`)
      }
    } catch (error) {
      console.error('Search Error:', error)
      setStatusMessage('Failed to connect to server.')
    } finally {
      setIsSearching(false)
    }
  }

  const resetApp = () => {
    setPage('home')
    setSelectedTag(null)
    setExtractedNames([])
    setLinkedinUrls({})
    setResults([])
    setPreview(null)
    setStatusMessage('')
  }

  // Homepage with tag selection
  if (page === 'home') {
    return (
      <div className="app home">
        <div className="container">
          <div className="hero">
            <div className="hero-content">
              <div className="logo">
                <div className="logo-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                  </svg>
                </div>
                <span className="logo-text">Halo Trace</span>
              </div>

              <h1 className="hero-title">Find LinkedIn Profiles<br/>From Any Image</h1>
              <p className="hero-subtitle">
                Upload a poster, flyer, or screenshot and instantly discover LinkedIn profiles
                using AI-powered recognition of names, logos, and faces.
              </p>

              <div className="selection-prompt">
                <h3>What are you looking for?</h3>
                <div className="tag-selector-home">
                  {tags.map((tag) => (
                    <button
                      key={tag.value}
                      onClick={() => handleTagSelect(tag.value)}
                      className="tag-option-home"
                    >
                      <div className="tag-icon-home">
                        {tag.icon}
                      </div>
                      <div className="tag-info">
                        <span className="tag-label">{tag.label}</span>
                        <span className="tag-desc">{tag.desc}</span>
                      </div>
                      <svg className="tag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="visual-card">
                <div className="visual-header">
                  <span className="visual-dot"></span>
                  <span className="visual-dot"></span>
                  <span className="visual-dot"></span>
                </div>
                <div className="visual-content">
                  <div className="visual-line short"></div>
                  <div className="visual-line"></div>
                  <div className="visual-line medium"></div>
                  <div className="visual-names">
                    <span>John Smith</span>
                    <span>TechCorp Inc</span>
                    <span>Sarah Johnson</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <footer>
            <p>Powered by <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer">Google Gemini AI</a></p>
          </footer>
        </div>
      </div>
    )
  }

  // Upload page
  if (page === 'upload') {
    const currentTag = tags.find(t => t.value === selectedTag)

    return (
      <div className="app">
        <div className="container">
          <nav className="nav">
            <div className="logo" onClick={resetApp} style={{ cursor: 'pointer' }}>
              <div className="logo-icon small">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
              <span className="logo-text small">Halo Trace</span>
            </div>
            <div className="current-mode">
              <div className="mode-icon">{currentTag?.icon}</div>
              <span>Finding {currentTag?.label}</span>
            </div>
          </nav>

          <main>
            {/* Upload Section */}
            <section className="card">
              <div className="card-header">
                <div className="step-number">1</div>
                <h2>Upload Image</h2>
              </div>
              <p className="card-hint">
                {selectedTag === 'companies'
                  ? 'Upload an image containing company names or logos'
                  : 'Upload an image containing person names or photos'}
              </p>
              <div className="upload-area">
                {preview ? (
                  <div className="preview-container">
                    <img src={preview} alt="Preview" className="preview" />
                    <div className="preview-overlay">
                      <label className="preview-change">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        Click to change image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={isProcessing}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className={`upload-zone ${isProcessing ? 'disabled' : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isProcessing}
                    />
                    <div className="upload-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                      </svg>
                    </div>
                    <p className="upload-text">Drop your image here or click to browse</p>
                    <p className="upload-hint">Supports PNG, JPG, JPEG up to 10MB</p>
                  </div>
                )}
              </div>
              {isProcessing && (
                <div className="loader">
                  <div className="loader-spinner"></div>
                  {selectedTag === 'companies'
                    ? 'Identifying companies from logos & text...'
                    : 'Identifying people from photos & text...'}
                </div>
              )}
            </section>

            {/* Extracted Names */}
            {extractedNames.length > 0 && (
              <section className="card">
                <div className="card-header">
                  <div className="step-number">2</div>
                  <h2>
                    {selectedTag === 'companies' ? 'Identified Companies' : 'Identified People'} ({extractedNames.length})
                  </h2>
                </div>
                <div className="names-grid">
                  {extractedNames.map((name, i) => (
                    <span key={i} className="name-tag">{name}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Search Button */}
            {extractedNames.length > 0 && (
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="search-btn"
              >
                {isSearching ? (
                  <>
                    <div className="loader-spinner"></div>
                    Finding Profiles...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
                      <circle cx="4" cy="4" r="2"/>
                    </svg>
                    Find LinkedIn {selectedTag === 'companies' ? 'Company Pages' : 'Profiles'}
                  </>
                )}
              </button>
            )}

            {/* Status Message */}
            {statusMessage && (
              <div className="status">
                <span className="status-icon"></span>
                {statusMessage}
              </div>
            )}
          </main>

          <footer>
            <p>Powered by <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer">Google Gemini AI</a></p>
          </footer>
        </div>
      </div>
    )
  }

  // Results page
  if (page === 'results') {
    return (
      <div className="app">
        <div className="container">
          <nav className="nav">
            <div className="logo" onClick={resetApp} style={{ cursor: 'pointer' }}>
              <div className="logo-icon small">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
              <span className="logo-text small">Halo Trace</span>
            </div>
            <button className="nav-btn" onClick={() => setPage('upload')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
          </nav>

          <main>
            <div className="results-header">
              <h1>
                {selectedTag === 'companies' ? 'Company Pages' : 'LinkedIn Profiles'} Found
              </h1>
              <p className="results-summary">
                {results.filter(r => r.isExactMatch).length} exact matches, {results.filter(r => !r.isExactMatch).length} not found
              </p>
            </div>

            <div className="results-grid">
              {results.map((result, i) => (
                <div key={i} className={`result-card ${result.isExactMatch ? 'exact' : 'no-match'}`}>
                  <div className="result-badge">
                    {result.isExactMatch ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Exact Match
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                        No Match Found
                      </>
                    )}
                  </div>

                  <div className="result-name">{result.name}</div>

                  {result.profileTitle && (
                    <div className="result-title">{result.profileTitle}</div>
                  )}

                  {result.linkedinUrl ? (
                    <a
                      href={result.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="result-btn"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
                        <circle cx="4" cy="4" r="2"/>
                      </svg>
                      View Profile
                    </a>
                  ) : (
                    <div className="result-btn disabled">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
                        <circle cx="4" cy="4" r="2"/>
                      </svg>
                      Not Available
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button className="new-search-btn" onClick={resetApp}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
              Start New Search
            </button>
          </main>

          <footer>
            <p>Powered by <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer">Google Gemini AI</a></p>
          </footer>
        </div>
      </div>
    )
  }

  return null
}

export default App
