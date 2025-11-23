import { useState, useEffect } from 'react'
import './App.css'
import logo from './assets/logo.png'
import despImage from './assets/desp.png'

function App() {
  const [page, setPage] = useState('auth')
  const [authMode, setAuthMode] = useState('login')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedTag, setSelectedTag] = useState(null)
  const [extractedNames, setExtractedNames] = useState([])
  const [linkedinUrls, setLinkedinUrls] = useState({})
  const [results, setResults] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [preview, setPreview] = useState(null)

  const handleAuthSubmit = (e) => {
    e.preventDefault()
    // Simple auth simulation - in production, connect to backend
    setIsLoggedIn(true)
    setPage('home')
  }

  const handleSocialLogin = (provider) => {
    // In production, implement OAuth flow
    console.log(`Login with ${provider}`)
    setIsLoggedIn(true)
    setPage('home')
  }

  // Chatbot animation effect
  useEffect(() => {
    if (page !== 'auth') return

    const layers = [
      { id: "hair", initialOffset: { x: 0, y: -18 }, maxOffset: 4, reverse: true },
      { id: "head", initialOffset: { x: 0, y: 4 }, maxOffset: 4 },
      { id: "face", initialOffset: { x: 0, y: 7 }, maxOffset: 8 },
      { id: "expression", initialOffset: { x: 0, y: 7 }, maxOffset: 12 }
    ].map((layer) => ({
      ...layer,
      element: document.getElementById(layer.id)
    }))

    const container = document.getElementById("chatbot")
    if (!container) return

    let containerRect = container.getBoundingClientRect()
    let maxDistance = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) / 2
    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let animationId

    layers.forEach((layer) => {
      if (!layer.element) return
      const { x, y } = layer.initialOffset
      layer.element.style.setProperty("--offset-x", `${x}px`)
      layer.element.style.setProperty("--offset-y", `${y}px`)
    })

    function updateParallax() {
      const centerX = containerRect.left + containerRect.width / 2
      const centerY = containerRect.top + containerRect.height / 2
      const dx = mouseX - centerX
      const dy = mouseY - centerY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance === 0) return

      const influence = Math.min(distance / maxDistance, 1)
      const dirX = dx / distance
      const dirY = dy / distance

      layers.forEach((layer) => {
        if (!layer.element) return
        const { x: initialX, y: initialY } = layer.initialOffset
        const factor = layer.reverse ? -1 : 1
        const offsetX = dirX * layer.maxOffset * influence * factor
        const offsetY = dirY * layer.maxOffset * influence * factor
        layer.element.style.setProperty("--offset-x", `${initialX + offsetX}px`)
        layer.element.style.setProperty("--offset-y", `${initialY + offsetY}px`)
      })
    }

    function rotateAnimate() {
      updateParallax()
      animationId = requestAnimationFrame(rotateAnimate)
    }

    const handleMouseMove = (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const handleResize = () => {
      containerRect = container.getBoundingClientRect()
      maxDistance = Math.sqrt(window.innerWidth ** 2 + window.innerHeight ** 2) / 2
    }

    document.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("resize", handleResize)
    rotateAnimate()

    // Blink animation
    const blinkConfig = {
      minInterval: 5000,
      maxInterval: 10000,
      closeSpeed: 100,
      closedDuration: 150,
      openSpeed: 150
    }

    const leftEye = document.getElementById("eye-l")
    const rightEye = document.getElementById("eye-r")
    let blinkTimeout

    function blink() {
      if (!leftEye || !rightEye) return
      const leftBox = leftEye.getBBox()
      const rightBox = rightEye.getBBox()
      const leftCenterY = leftBox.y + leftBox.height / 2
      const rightCenterY = rightBox.y + rightBox.height / 2

      leftEye.style.transformOrigin = `${leftBox.x + leftBox.width / 2}px ${leftCenterY}px`
      rightEye.style.transformOrigin = `${rightBox.x + rightBox.width / 2}px ${rightCenterY}px`

      leftEye.style.transition = `transform ${blinkConfig.closeSpeed}ms ease-out`
      rightEye.style.transition = `transform ${blinkConfig.closeSpeed}ms ease-out`
      leftEye.style.transform = "scaleY(0.1)"
      rightEye.style.transform = "scaleY(0.1)"

      setTimeout(() => {
        leftEye.style.transition = `transform ${blinkConfig.openSpeed}ms ease-out`
        rightEye.style.transition = `transform ${blinkConfig.openSpeed}ms ease-out`
        leftEye.style.transform = "scaleY(1)"
        rightEye.style.transform = "scaleY(1)"
      }, blinkConfig.closeSpeed + blinkConfig.closedDuration)
    }

    function blinkAnimate() {
      const randomDelay = Math.random() * (blinkConfig.maxInterval - blinkConfig.minInterval) + blinkConfig.minInterval
      blinkTimeout = setTimeout(() => {
        blink()
        blinkAnimate()
      }, randomDelay)
    }

    blinkAnimate()

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("resize", handleResize)
      cancelAnimationFrame(animationId)
      clearTimeout(blinkTimeout)
    }
  }, [page])

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

  // Auth page (Login/Signup)
  if (page === 'auth') {
    return (
      <div className="auth-page">
        {/* Left Panel - Branding */}
        <div className="auth-left-panel">
          <div className="auth-brand-content">
            {/* Large Robot */}
            <div className="auth-robot-large">
              <div id="chatbot">
                <svg id="hair" className="robot-layer" width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M29.9988 24.148L5.8512 0L-5.0344e-05 5.85133L24.1476 29.9993L29.9988 24.148Z" fill="#8B5A2B" />
                  <path d="M24.1487 0.00046199L0.00109863 24.1484L5.85235 29.9998L30 5.8518L24.1487 0.00046199Z" fill="#8B5A2B" />
                </svg>
                <svg id="head" className="robot-layer" width="52" height="50" viewBox="0 0 52 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M26,0c20.24,0,26,5.49,26,26.47,0,23.84-10.75,23.53-26,23.53S0,50.31,0,26.47C0,5.49,5.76,0,26,0Z" fill="url(#head-color)" />
                  <defs>
                    <linearGradient id="head-color" x1="26" y1="0" x2="26" y2="50" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#69D7FF" />
                      <stop offset="1" stopColor="#00B4F5" />
                    </linearGradient>
                  </defs>
                </svg>
                <svg id="face" className="robot-layer" width="44" height="36" viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22,36c15.09,0,20.52-.87,21.83-16.94S39.44,0,22,0-1.1,3.45.17,19.06c1.3,16.07,6.74,16.94,21.83,16.94Z" fill="url(#face-color)" />
                  <defs>
                    <linearGradient id="face-color" x1="22" y1="0" x2="22" y2="36" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#005284" />
                      <stop offset="1" stopColor="#0076BE" />
                    </linearGradient>
                  </defs>
                </svg>
                <svg id="expression" className="robot-layer" width="30" height="15" viewBox="0 0 32 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path id="eye-l" d="M3.78,12c3.45,0,3.78-2.7,3.78-6S7.56,0,3.78,0,0,2.7,0,6s.33,6,3.78,6Z" fill="white" />
                  <path id="mouth" d="M13.05,12.76c-1.13-.45-.82,2.24,2.99,2.24,4.21,0,4.24-3.55,3.01-4.13-1.35-.64-1.75,3.6-5.99,1.89Z" fill="white" />
                  <path id="eye-r" d="M26.22,12c3.45,0,3.78-2.7,3.78-6s0-6-3.78-6-3.78,2.7-3.78,6,.33,6,3.78,6Z" fill="white" />
                </svg>
              </div>
            </div>

            {/* Large Logo */}
            <img src={logo} alt="Halo Trace" className="auth-logo-large" />

            <h1 className="auth-brand-title">Halo Trace</h1>
            <p className="auth-brand-tagline">AI-Powered LinkedIn Profile Finder</p>
          </div>

          {/* Decorative elements */}
          <div className="auth-decoration">
            <div className="deco-circle deco-1"></div>
            <div className="deco-circle deco-2"></div>
            <div className="deco-circle deco-3"></div>
          </div>
        </div>

        {/* Right Panel - Forms with Slider */}
        <div className="auth-right-panel">
          <div className="auth-slider-container">
            {/* Tab Switcher */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Sign In
              </button>
              <button
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Sign Up
              </button>
              <div className={`auth-tab-indicator ${authMode === 'signup' ? 'right' : ''}`}></div>
            </div>

            {/* Sliding Forms */}
            <div className="auth-forms-wrapper">
              <div className={`auth-forms-slider ${authMode === 'signup' ? 'slide-left' : ''}`}>
                {/* Login Form */}
                <div className="auth-form-panel">
                  <h2 className="auth-form-title">Welcome Back!</h2>
                  <p className="auth-form-subtitle">Sign in to continue your journey</p>

                  <form onSubmit={handleAuthSubmit} className="auth-form">
                    <div className="auth-input-group">
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                        required
                      />
                    </div>

                    <div className="auth-input-group">
                      <label>Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={authForm.password}
                          onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="auth-submit-btn">
                      Sign In
                    </button>
                  </form>

                  <div className="auth-divider">
                    <span>or continue with</span>
                  </div>

                  <div className="social-buttons">
                    <button type="button" className="social-btn" onClick={() => handleSocialLogin('google')}>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </button>
                    <button type="button" className="social-btn" onClick={() => handleSocialLogin('linkedin')}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </button>
                  </div>
                </div>

                {/* Signup Form */}
                <div className="auth-form-panel">
                  <h2 className="auth-form-title">Get Started</h2>
                  <p className="auth-form-subtitle">Create your account today</p>

                  <form onSubmit={handleAuthSubmit} className="auth-form">
                    <div className="auth-input-group">
                      <label>Name</label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={authForm.name}
                        onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                        required
                      />
                    </div>

                    <div className="auth-input-group">
                      <label>Email</label>
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={authForm.email}
                        onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                        required
                      />
                    </div>

                    <div className="auth-input-group">
                      <label>Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={authForm.password}
                          onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="auth-input-group">
                      <label>Confirm Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          value={authForm.confirmPassword}
                          onChange={(e) => setAuthForm({...authForm, confirmPassword: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                              <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="auth-submit-btn">
                      Create Account
                    </button>
                  </form>

                  <div className="auth-divider">
                    <span>or continue with</span>
                  </div>

                  <div className="social-buttons">
                    <button type="button" className="social-btn" onClick={() => handleSocialLogin('google')}>
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </button>
                    <button type="button" className="social-btn" onClick={() => handleSocialLogin('linkedin')}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      LinkedIn
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Homepage with tag selection
  if (page === 'home') {
    return (
      <div className="app home">
        {/* Decorative background elements */}
        <div className="bg-decoration">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
          <div className="floating-shape shape-4"></div>
        </div>

        <div className="hero-section">
          <div className="hero-left">
            <div className="title-with-logo">
              <img src={logo} alt="Halo Trace" className="hero-logo-img" />
              <h1 className="main-title">
                HALO<br/>TRACE
              </h1>
            </div>
            <p className="main-subtitle">AI-Powered LinkedIn Profile Finder</p>
            <p className="main-desc">
              Upload a poster, flyer, or screenshot and instantly discover LinkedIn profiles using AI-powered recognition of company logos, names, and people.
            </p>
            <div className="hero-buttons">
              {tags.map((tag) => (
                <button
                  key={tag.value}
                  onClick={() => handleTagSelect(tag.value)}
                  className={`hero-btn ${tag.value === 'companies' ? 'primary' : 'secondary'}`}
                >
                  {tag.icon}
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="hero-right">
            <div className="mockup-container">
              <img src={despImage} alt="Halo Trace Demo" className="hero-mockup" />
              <div className="mockup-glow"></div>
            </div>
          </div>
        </div>
        <footer className="hero-footer">
          <p>Powered by <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer">Google Gemini AI</a></p>
        </footer>
      </div>
    )
  }

  // Upload page
  if (page === 'upload') {
    const currentTag = tags.find(t => t.value === selectedTag)

    return (
      <div className="app">
        {/* Decorative background elements */}
        <div className="bg-decoration">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
        </div>

        <div className="container">
          <nav className="nav">
            <div className="logo" onClick={resetApp} style={{ cursor: 'pointer' }}>
              <img src={logo} alt="Halo Trace" className="nav-logo" />
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
        {/* Decorative background elements */}
        <div className="bg-decoration">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
        </div>

        <div className="container">
          <nav className="nav">
            <div className="logo" onClick={resetApp} style={{ cursor: 'pointer' }}>
              <img src={logo} alt="Halo Trace" className="nav-logo" />
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
