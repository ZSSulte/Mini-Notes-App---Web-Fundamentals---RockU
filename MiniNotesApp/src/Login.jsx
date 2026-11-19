import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();

    /* Clear stored session if user navigates back to Login */
    useEffect(() => {
      const clearSession = () => {
        localStorage.removeItem('user');
      };

      clearSession();
      window.addEventListener('pageshow', clearSession);
      return () => window.removeEventListener('pageshow', clearSession);
    }, []);

    const handleSubmit = async (e) => {
    e.preventDefault();
    
     {/* Check for empty/null fields */}
    if (!email.trim() || !password.trim()) {
      setErrorMessage('All fields are required. Please fill in every box.');
      setEmail('');     // Reset email input
      setPassword('');  // Reset password input
      return;
    }

    // 2. Check if the email OR password is incorrect
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Invalid email address or password.');
      setEmail('');     // Reset email input
      setPassword('');  // Reset password input
      return;
    }

    {/* Clear error message if validation passes */}
    setErrorMessage('');
    setIsSubmitting(true);

    {/* Proceed with registration / API submission logic */}
    try {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Saves the Flask session cookie in the browser
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setIsSubmitting(false);
          setErrorMessage(data.error || 'Invalid email address or password.');
          setEmail('');
          setPassword('');
          return;
        }

        // Save user info (id, fullName, email) for Dashboard
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Reset input fields after successful sign in
        setEmail('');     // Reset email input
        setPassword('');  // Reset password input

        // Time before it navigates to the Dashboard page
        setTimeout(() => {
          navigate('/Dashboard');
      }, 1500);
      } catch (error) {
        console.error('Login error:', error);
        setIsSubmitting(false);
        setErrorMessage('Cannot connect to the server. Make sure Flask is running.');
      }
  };

  return (
    <div className="login">
      {/* Login Form */}
       <form className={`login-form ${errorMessage ? 'has-error' : ''}`} onSubmit={handleSubmit}noValidate>

        {/* Header and H1 */}
       <header className="header">
        <h1>Mini Notes</h1>

        {/* Welcome */}
        <p className="Welcome"><b>Welcome!</b></p>

        {/* Sign in to continue notes */}
        <p className = "Subheader">Sign in to continue your notes.</p>
      </header>

        {/* Display validation error message if triggered */}
        {errorMessage && <p className="error-banners">{errorMessage}</p>}

        {/* Email Address Input */}
        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="EmailAddress"
          readOnly
          onFocus={(e) => e.target.removeAttribute('readonly')}
          autoComplete='username'
        />

        {/* Password Input */}
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="Password"
            readOnly
            onFocus={(e) => e.target.removeAttribute('readonly')}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="toggle-password-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Sign in Button */}
        <button type="submit" className="SignIn" disabled={isSubmitting}>{isSubmitting ? 'Signing In...' : 'Sign In'}</button>

        {/* Create an Account Message and Link */}
        <p className = "EndText">Don't have an account yet? <Link to="/CreateAccount" className = "SignupLink">Create one</Link></p>
      </form>
    </div>
  )
}

export default Login