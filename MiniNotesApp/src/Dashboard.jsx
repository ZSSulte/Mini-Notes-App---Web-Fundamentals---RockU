import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import './FeedbackForm.css'
import './FeedbackInbox.css'
import './AccountManagement.css'

function Dashboard() {
    const navigate = useNavigate();

  /* Retuns back to Login if user is not authenticated which includes browser Forward/Back cache */
   useEffect(() => {
      const checkAuth = () => {
        if (!localStorage.getItem('user')) {
          navigate('/Login', { replace: true });
        }
      };

      const handleBrowserBack = () => {
        localStorage.removeItem('user');
      };

      if (!localStorage.getItem('user')) {
        navigate('/Login', { replace: true });
        return;
      }

      checkAuth();
      window.addEventListener('pageshow', checkAuth);
      window.addEventListener('popstate', handleBrowserBack);

      return () => {
        window.removeEventListener('pageshow', checkAuth);
        window.removeEventListener('popstate', handleBrowserBack);
      };
    }, [navigate]);

    /* Verify active Flask session cookie on page load */
    useEffect(() => {
      const verifySession = async () => {
        try {
          const response = await fetch('http://127.0.0.1:5000/api/session', {
            credentials: 'include',
          });
          if (!response.ok) {
            localStorage.removeItem('user');
            navigate('/Login', { replace: true });
          }
        } catch (error) {
          console.error('Error verifying session:', error);
        }
      };

      verifySession();
    }, [navigate]);

    /* Get logged-in user's first name and if user is using an admin account */
   const [currentUser, setCurrentUser] = useState(() => {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    });
    const firstName = currentUser?.firstName?.trim() || 'User';
    const isAdmin = Boolean(currentUser?.isAdmin);

    /* Modal, Input, and Notes States */
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [noteError, setNoteError] = useState('');
    const [notes, setNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    /* Filter notes by title or content based on search input */
    const filteredNotes = notes.filter((note) => {
      const query = searchQuery.toLowerCase().trim();
      return (
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      );
    });

    /* Function to load saved notes from PostgreSQL when Dashboard opens */
    useEffect(() => {
      if (!currentUser?.id) return;

      const fetchNotes = async () => {
        try {
          const response = await fetch(`http://127.0.0.1:5000/api/notes/${currentUser.id}`, {
            credentials: 'include',
          });

          const data = await response.json();
          if (response.ok) {
            setNotes(data);
          }
        } catch (error) {
          console.error('Error loading notes:', error);
        }
      };

      fetchNotes();
    }, [currentUser?.id]);

    /* Feedback Inbox Messages State */    
    const [inboxMessages, setInboxMessages] = useState([]);  

    /* Load saved feedback messages from PostgreSQL so Admins can only see it */
    useEffect(() => {
      if (!currentUser?.id || !isAdmin) return;

      const fetchFeedback = async () => {
        try {
          const response = await fetch('http://127.0.0.1:5000/api/feedback', {
            credentials: 'include',
          });

          const data = await response.json();
          if (response.ok) {
            setInboxMessages(data);
          }
        } catch (error) {
          console.error('Error loading feedback messages:', error);
        }
      };

      fetchFeedback();
    }, [currentUser?.id, isAdmin]);

    /* Editing and Deletion States */
    const [editingNoteId, setEditingNoteId] = useState(null);
    const [noteToDelete, setNoteToDelete] = useState(null);

    /* Active Sidebar Tab and Feedback Form States */
    const [activeTab, setActiveTab] = useState('MyNotes');
    const userEmail =currentUser?.email;
    const [contactForm, setContactForm] = useState({
      name: '',
      email: userEmail,
      subject: '',
      message: '',
      rating: 5,
    });
    const [hoverRating, setHoverRating] = useState(0);
    const [contactStatus, setContactStatus] = useState({ type: '', text: '' });
    
    /* Account Management Form States */
    const [accountForm, setAccountForm] = useState({
      firstName: currentUser?.firstName || '',
      lastName: currentUser?.lastName || '',
      email: currentUser?.email || '',
      password: '',
    });
    const [accountStatus, setAccountStatus] = useState({ type: '', text: '' });
    const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

    /* Clear banner and reset form fields only when switching tab */
    useEffect(() => {
      setAccountStatus({ type: '', text: '' });
      setAccountForm({
        firstName: currentUser?.firstName || '',
        lastName: currentUser?.lastName || '',
        email: currentUser?.email || '',
        password: '',
      });
    }, [activeTab]);

    const handleAccountChange = (e) => {
      const { name, value } = e.target;
      setAccountForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleAccountSubmit = async (e) => {
      e.preventDefault();

      if (!accountForm.firstName.trim() || !accountForm.lastName.trim()) {
        setAccountStatus({
          type: 'error',
          text: 'First name and last name cannot be empty.',
        });
        return;
      }

      /* Validate New Password if anything is entered in the password field */
      if (accountForm.password.length > 0) {
        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(accountForm.password)) {
          setAccountStatus({
            type: 'error',
            text: 'Password must be at least 8 characters long and include: 1 Uppercase, 1 Lowercase, 1 Number, and 1 Symbol (@$!%*?&).',
          });
          setAccountForm((prev) => ({ ...prev, password: '' }));
          return;
        }
      }

      setAccountStatus({ type: '', text: '' });
      setIsUpdatingAccount(true);

      try {
        const response = await fetch(`http://127.0.0.1:5000/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            firstName: accountForm.firstName.trim(),
            lastName: accountForm.lastName.trim(),
            password: accountForm.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setAccountStatus({
            type: 'error',
            text: data.error || 'Failed to update account.',
          });
          setAccountForm((prev) => ({ ...prev, password: '' }));
          return;
        }

        localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setAccountForm({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          password: '',
        });
        setAccountStatus({
          type: 'success',
          text: 'Account updated successfully!',
        });
      } catch (error) {
        console.error('Error updating account:', error);
        setAccountStatus({
          type: 'error',
          text: 'Cannot connect to the server. Make sure Flask is running.',
        });
      } finally {
        setIsUpdatingAccount(false);
      }
    };

    /* Removes the banner and the text that user inputs when changed tab in Feedback Form */
    useEffect(() => {
      setContactStatus({ type: '', text: '' });
      setHoverRating(0);
      setContactForm({
        name: '',
        email: userEmail,
        subject: '',
        message: '',
        rating: 5,
      });
    }, [activeTab, userEmail]);

    /* Logout Function */
    const handleLogout = async () => {
      try {
        await fetch('http://127.0.0.1:5000/api/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Error logging out:', error);
      } finally {
        localStorage.removeItem('user');
        navigate('/Login', { replace: true }); 
      }
    };

    /* Modal Open, Edit, and CLose Handlers */
    const handleOpenModal = () => {
      setEditingNoteId(null);
      setTitle('');
      setContent('');
      setNoteError('');
      setIsModalOpen(true);
      };

    const handleOpenEditModal = (note) => {
      setEditingNoteId(note.id);
      setTitle(note.title);
      setContent(note.content);
      setNoteError('');
      setIsModalOpen(true);
      };

    const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingNoteId(null);
      setTitle('');
      setContent('');
      setNoteError('');
      };

    /* Modal Save and Edit Handlers */
    const handleSaveNote = async (e) => {
      e.preventDefault();
      
      if (!content.trim()) {
        setNoteError('Note content cannot be empty.');
        return;
      }

      setNoteError('');

      if (editingNoteId !== null) {
        try {
          const response = await fetch(`http://127.0.0.1:5000/api/notes/${editingNoteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title, content }),
          });

          const data = await response.json();

          if (!response.ok) {
            setNoteError(data.error || 'Failed to update note.');
            return;
          }

          setNotes([data, ...notes.filter((note) => note.id !== editingNoteId)]);
          handleCloseModal();
        } catch (error) {
          console.error('Error updating note:', error);
          setNoteError('Cannot connect to the server. Make sure Flask is running.');
        }
      } else {
        try {
          const response = await fetch('http://127.0.0.1:5000/api/notes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              user_id: currentUser.id,
              title: title.trim() || 'Untitled',
              content: content.trim(),
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            setNoteError(data.error || 'Failed to save note.');
            return;
          }

          setNotes([data, ...notes]);
          handleCloseModal();
        } catch (error) {
          console.error('Error creating note:', error);
          setNoteError('Cannot connect to the server. Make sure Flask is running.');
        }
      }
    };

    /* Open Delete Modal, Cancel Delete, and Confirm Delete Modal Handlers */
    const handleOpenDeleteModal = (noteId) => {
      setNoteToDelete(noteId);
    };

    const handleCancelDelete = () => {
      setNoteToDelete(null);
    };

    const handleConfirmDelete = async () => {
      if (noteToDelete === null) return;

      try {
        const response = await fetch(`http://127.0.0.1:5000/api/notes/${noteToDelete}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.ok) {
          setNotes(notes.filter((note) => note.id !== noteToDelete));
        } else {
          const data = await response.json();
          console.error('Failed to delete note:', data.error);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
      } finally {
        setNoteToDelete(null);
      }
    };  

    /* Contact Us and Submit Handlers */
    const handleContactChange = (e) => {
      const { name, value } = e.target;
      setContactForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleContactSubmit = async (e) => {
      e.preventDefault();

      if (
        !contactForm.name.trim() ||
        !contactForm.email.trim() ||
        !contactForm.subject.trim() ||
        !contactForm.message.trim()
      ) {
        setContactStatus({
          type: 'error',
          text: 'Please fill out Name, Subject, and Message before sending.',
        });
        return;
      }

      try {
        const response = await fetch('http://127.0.0.1:5000/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            user_id: currentUser.id,
            name: contactForm.name.trim(),
            email: contactForm.email.trim(),
            subject: contactForm.subject.trim(),
            message: contactForm.message.trim(),
            rating: contactForm.rating,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setContactStatus({
            type: 'error',
            text: data.error || 'Failed to send feedback.',
          });
          return;
        }

        if (isAdmin) {
          setInboxMessages((prev) => [data, ...prev]);
        }

        setContactStatus({
          type: 'success',
          text: 'Message sent! Thank you for reaching out.',
        });
        setContactForm({ name: '', email: userEmail, subject: '', message: '', rating: 5 });
      } catch (error) {
        console.error('Error sending feedback:', error);
        setContactStatus({
          type: 'error',
          text: 'Cannot connect to the server. Make sure Flask is running.',
        });
      }
    };

  return (
    <div className="dashboard-container">
      {/* Left Sidebar Container */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="sparkle"></span>
            <h2>Mini Notes</h2>
          </div>

          <nav className="nav-menu">
            <a href="#MyNotes" className={`nav-item ${activeTab === 'MyNotes' ? 'active' : ''}`} onClick={(e) => {e.preventDefault(); setActiveTab('MyNotes');}}>
              <span className="icon">≡</span> My Notes
            </a>
            <a href="#Feedback" className={`nav-item ${activeTab === 'Feedback' ? 'active' : ''}`} onClick={(e) => {e.preventDefault(); setActiveTab('Feedback');}}>
              <span className="icon">➤</span> Feedback
            </a>
            {isAdmin && (
            <a href="#FeedbackInbox" className={`nav-item ${activeTab === 'FeedbackInbox' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('FeedbackInbox');}}>             
              <span className="icon">✉︎</span> Feedback Inbox
            </a>
            )}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>
            <span className="icon">↪</span> Log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-bar">
          {activeTab === 'MyNotes' ? (
            <input
              type="text"
              placeholder=" 🔎︎ Search your notes..."
              className="SearchBar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          ) : activeTab === 'FeedbackInbox' && isAdmin ? (
            <div className="feedback-page-header">
              <h2>Feedback Inbox</h2>
              <p className="subtitle">Preview messages and ratings sent to you.</p>
            </div>
          ) : activeTab === 'AccountManagement' ? (
            <div className="feedback-page-header">
              <h2>Account Management</h2>
              <p className="subtitle">View and update your personal account details.</p>
            </div>  
          ) : (
            <div className="feedback-page-header">
              <h2>Feedback</h2>
              <p className="subtitle">
                Have a question or concern? Help us make Mini Notes better.
              </p>
            </div>
          )}
          <div className={`user-profile ${activeTab === 'AccountManagement' ? 'active' : ''}`}
            onClick={() => setActiveTab('AccountManagement')}
            title="Account Management"
            style={{ cursor: 'pointer' }}>{firstName.charAt(0).toUpperCase()}
          </div>
        </header>

      {/* My Notes Form */}
      {activeTab === 'MyNotes' && (
      <>
        <section className="dashboard-header-section">
          <div>
            <h2>Hello, {firstName}!</h2>
            <p className="subtitle">Capture your thoughts, one note at a time.</p>
          </div>
          <button type="button" className="NewNote-btn" onClick={handleOpenModal}>+ New Note</button>
        </section>

        <section className="NotesSection">
          <h3>My Notes</h3>
          {filteredNotes.length === 0 ? (
            <div className="empty-notes-state">
              <p className="empty-notes-title">
                {notes.length === 0 ? 'No notes yet' : 'No matching notes found'}
              </p>
              <p className="empty-notes-subtitle">
                {notes.length === 0
                  ? 'Click "+ New Note" to create your first note.'
                  : `No notes matched "${searchQuery}". Try a different keyword.`}
              </p>
            </div>
          ) : (
          <div className="notes-grid">
            {filteredNotes.map((note) => (
              <div key={note.id} className="note-card">
                <h4>{note.title}</h4>
                <p>{note.content}</p>
                <div className="note-footer">
                  <span>{note.date}</span>
                  <div className="note-actions">
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => handleOpenEditModal(note)}
                    >
                      ✎ Edit
                    </button>
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => handleOpenDeleteModal(note.id)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </section>
      </>
    )}

    {/* Feedback Form */}
        {activeTab === 'Feedback' && (
          <section className="feedback-section">
            <div className="feedback-card">
              <h3>Send us a message</h3>
              <p className="feedback-card-subtitle">
                Fill out the form below and we will get back to you soon.
              </p>

              {contactStatus.text && (
                <div className={`feedback-banner ${contactStatus.type}`}>
                  {contactStatus.text}
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="feedback-form" noValidate>
                <div className="feedback-field">
                  <label htmlFor="contact-name">Name</label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    placeholder="Enter your name"
                    value={contactForm.name}
                    onChange={handleContactChange}
                    className="feedback-input"
                  />
                </div>

                <div className="feedback-field">
                  <label htmlFor="contact-email">Email</label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={contactForm.email}
                    onChange={handleContactChange}
                    className="feedback-input"
                    readOnly
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                </div>

                <div className="feedback-field">
                  <label htmlFor="contact-subject">Subject</label>
                  <input
                    id="contact-subject"
                    type="text"
                    name="subject"
                    placeholder="What is this about?"
                    value={contactForm.subject}
                    onChange={handleContactChange}
                    className="feedback-input"
                  />
                </div>

                <div className="feedback-field">
                  <label htmlFor="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    placeholder="Write your message..."
                    value={contactForm.message}
                    onChange={handleContactChange}
                    className="feedback-textarea"
                    rows={5}
                  />
                </div>

                <div className="feedback-field">
                  <label>Rate Mini Notes</label>
                  <div className="rating-stars-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${
                    star <= (hoverRating || contactForm.rating) ? 'active' : ''
                    }`}
                    onClick={() => setContactForm({ ...contactForm, rating: star })}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Rate ${star} stars`}
                  >
                  ★
                  </button>
                     ))}
                  <span className="rating-label">{contactForm.rating} / 5</span>
                </div>
              </div>

                <button type="submit" className="send-feedback-btn">
                  Send Message
                </button>
              </form>
            </div>
          </section>
        )}

    {/* Feedback Inbox Form */}
        {activeTab === 'FeedbackInbox' && isAdmin && (
          <section className="inbox-section">
            {inboxMessages.length === 0 ? (
              <div className="empty-feedbackinbox-state">
                <p className="empty-feedbackinbox-title">No feedback messages yet</p>
                <p className="empty-feedbackinbox-subtitle">
                  Messages submitted from the Feedback tab will appear here.
                </p>
              </div>
            ) : (
            <div className="inbox-grid">
              {inboxMessages.map((item) => (
                <div key={item.id} className="inbox-card">
                    <div className="inbox-card-header">
                    <div className="inbox-sender">
                    <h4>{item.name}</h4>
                  <span className="inbox-email">{item.email}</span>
                </div>

                <div className="inbox-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                  <span
                  key={star}
                  className={star <= item.rating ? 'star filled' : 'star'}
                  >
                  ★
                  </span>
                ))}
              </div>
            </div>
              {item.subject && <h5 className="inbox-subject">{item.subject}</h5>}

              <p className="inbox-message">{item.message}</p>

              <span className="inbox-date">{item.date}</span>
            </div>
          ))}
        </div>
        )}
      </section>
      )}

    {/* Account Management Form */}
        {activeTab === 'AccountManagement' && (
          <section className="account-section">
            <div className="account-card">
              <h3>Profile & Security</h3>
              <p className="account-card-subtitle">
                Update your name or set a new password for your account.
              </p>

              {accountStatus.text && (
                <div className={`account-banner ${accountStatus.type}`}>
                  {accountStatus.text}
                </div>
              )}

              <form onSubmit={handleAccountSubmit} className="account-form" noValidate>
                <div className="account-field">
                  <label htmlFor="account-firstName">First Name</label>
                  <input
                    id="account-firstName"
                    type="text"
                    name="firstName"
                    placeholder="Enter your first name"
                    value={accountForm.firstName}
                    onChange={handleAccountChange}
                    className="account-input"
                  />
                </div>

                <div className="account-field">
                  <label htmlFor="account-lastName">Last Name</label>
                  <input
                    id="account-lastName"
                    type="text"
                    name="lastName"
                    placeholder="Enter your last name"
                    value={accountForm.lastName}
                    onChange={handleAccountChange}
                    className="account-input"
                  />
                </div>

                <div className="account-field">
                  <label htmlFor="account-email">Email</label>
                  <input
                    id="account-email"
                    type="email"
                    name="email"
                    value={accountForm.email}
                    className="account-input"
                    readOnly
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                  />
                </div>

                <div className="account-field">
                  <label htmlFor="account-password">New Password</label>
                  <input
                    id="account-password"
                    type="password"
                    name="password"
                    placeholder="Enter new password (optional)"
                    value={accountForm.password}
                    onChange={handleAccountChange}
                    className="account-input"
                    autoComplete="new-password"
                  />
                  <span className="password-hint">
                    Leave blank if you do not want to change your current password.
                  </span>
                </div>

                <div className="account-actions">
                  <button
                    type="submit"
                    className="save-account-btn"
                    disabled={isUpdatingAccount}
                  >
                    {isUpdatingAccount ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    className="cancel-account-btn"
                    onClick={() => setActiveTab('MyNotes')}
                    disabled={isUpdatingAccount}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}  
      </main>

      {/* Create a Note or Edit a Note Pop-up Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onMouseDown={handleCloseModal}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h2>{editingNoteId !== null ? 'Edit Note' : 'Create a note'}</h2>
              <button
                type="button"
                className="close-modal-btn"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="modal-form">
              {noteError && (
             <div className="feedback-banner error" style={{ marginBottom: '12px' }}>
               {noteError}
             </div>
              )}

              <input
                type="text"
                placeholder="Note Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="NoteTitle"
                autoFocus
              />

              <textarea
                placeholder="Write your thoughts..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="ContentNotes"
                rows={5}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button type="submit" className="save-note-btn">
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* Delete Confirmation Pop-up Modal */}
        {noteToDelete !== null && (
          <div className="modal-overlay" onMouseDown={handleCancelDelete}>
            <div
              className="confirm-modal-card"
              onMouseDown={(e) => e.stopPropagation()}
            >

            <h3>Delete Note</h3>
            <p>Are you sure you want to delete the note?</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-no-btn"
                onClick={handleCancelDelete}
              >
                No
              </button>
              <button
                type="button"
                className="confirm-yes-btn"
                onClick={handleConfirmDelete}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;