import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './CreateAccount.css'

function CreateAccount() {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isPasswordError, setIsPasswordError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
    e.preventDefault();

    {/* Check for empty/null fields */}
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
        setIsPasswordError(false);
        setErrorMessage('All fields are required. Please fill in every box.');
        
        // Clear only fields that were left empty or filled with spaces
        if (!firstName.trim()) setFirstName('');
        if (!lastName.trim()) setLastName('');
        if (!email.trim()) setEmail('');
        if (!password.trim()) setPassword('');
        return;
    }

    {/* Regex Rules */}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    const isEmailValid = emailRegex.test(email);
    const isPasswordValid = passwordRegex.test(password);

    {/* If both email and password is invalid */}
    if (!isEmailValid && !isPasswordValid) {
        setIsPasswordError(true);
        setErrorMessage('Invalid email address and password format.');
        setEmail('');
        setPassword('');
        return;
    }

    {/* Only email is invalid */}
    if (!isEmailValid) {
        setIsPasswordError(false);
        setErrorMessage('Please enter a valid email address.');
        setEmail(''); // Resets the invalid email input
        return;
    }

    {/* Validate Password by having 1 Uppercase, 1 Lowercase, 1 Number, 1 Special Symbol, Min 8 chars */}
    if (!isPasswordValid) {
        setIsPasswordError(true);
        setErrorMessage(
         'Password must be at least 8 characters long and include: 1 Uppercase, 1 Lowercase, 1 Number, and 1 Symbol (@$!%*?&).'
      );
        setPassword(''); // Resets the invalid password input
        return;
    }

    {/* Clear error message if it meets the correct criteria */}
    setErrorMessage('');
    setIsPasswordError(false);
    setIsSubmitting(true);

     {/* Database connection and insertion of data into the database */}
    try {
        const response = await fetch('http://127.0.0.1:5000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password: password,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
          setIsSubmitting(false);
          setIsPasswordError(false);
          setErrorMessage(data.error || 'Failed to create account.');
        
        if (response.status === 409) {
          setEmail(''); // Reset only the email field so the user keeps their name and password
        } else {
          // Database or server error (500): reset all fields
          setFirstName('');
          setLastName('');
          setEmail('');
          setPassword('');
        }
        return;
      }

        // Show green success banner, clear fields, then redirect
        setSuccessMessage('Account created successfully! Redirecting to login...');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        
        // Time before it navigates to the login page
        setTimeout(() => {
          navigate('/Login');
      }, 4000);

    // When Flask is offline or unreachable
    } catch (error) {
        console.error('Registration error:', error);
        setIsSubmitting(false);
        setIsPasswordError(false);
        setErrorMessage('Cannot connect to the server. Make sure Flask is running.');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
    }
  };

  return (
    <div className="createaccount">
      {/* Login Form */}
      <form className={`createaccount-form ${errorMessage ? 'has-error' : ''} ${successMessage ? 'has-success' : ''} ${isPasswordError ? 'password-error' : ''} ${isPasswordError ? 'password-error' : ''}`} onSubmit={handleSubmit} noValidate> 

        {/* Header and H1 */}
        <header className="header">
        <h1>Mini Notes</h1>

        {/* Welcome */}
        <p className="CreateAccountText"><b>Create an Account</b></p>

        {/* Sign in to continue notes */}
        <p className = "Subheader">Start organizing your thoughts today.</p>
        </header>

        {/* Display validation error message if triggered or success banner */}
        {errorMessage && (<p className={`error-banner ${isPasswordError ? 'password-error' : ''}`}>{errorMessage}</p>
        )}
        {successMessage && (<p className="success-banner">{successMessage}</p>
        )}

       {/* First Name Input */}
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="FirstName"
          readOnly
          onFocus={(e) => e.target.removeAttribute('readonly')}
          autoComplete='given-name'
        />

        {/* Last Name Input */}
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="LastName"
          readOnly
          onFocus={(e) => e.target.removeAttribute('readonly')}
          autoComplete='family-name'
        />

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
            autoComplete="new-password"
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

        {/* Sign in Button and change of text when submitting */}
        <button type="submit" className="CreateAccountBtn" disabled={isSubmitting}>{isSubmitting ? 'Creating Account...' : 'Create Account'}</button>

        {/* Create an Account Message and Link */}
        <p className = "EndText">Already have an account? <Link to="/Login" className = "SigninLink">Sign in</Link></p>
      </form>
    </div>
  )
}

export default CreateAccount