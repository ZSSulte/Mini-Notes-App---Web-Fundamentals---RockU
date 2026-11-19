# Mini Notes

A full-stack note-taking web application built with **React (Vite)**, **Python (Flask)**, and **PostgreSQL**. Users can register, sign in securely with session cookies, manage personal notes, update their account details, and submit feedback.

## Features (Phase 1)

- **Session-Based Authentication:** User registration, login, and logout powered by Flask `HttpOnly` session cookies (`SameSite=Lax`) and `werkzeug.security` password hashing.
- **Notes Management (CRUD):** Create, view, search, edit, and delete personal notes scoped strictly to the authenticated user.
- **Account Management:** Update first name, last name, and password with strong password validation.
- **Feedback System & Admin Inbox:** Authenticated users can submit star ratings and feedback messages, while admin accounts (`is_admin = TRUE`) can review submissions in the Feedback Inbox.
- **Database Security:** All PostgreSQL queries use `psycopg2` parameterized placeholders (`%s`), and database/session secrets are isolated in an environment file excluded from Git.

## Tech Stack

- **Frontend:** React, React Router, Vite, CSS
- **Backend:** Python, Flask, Flask-CORS, `python-dotenv`, `psycopg2`
- **Database:** PostgreSQL

## Project Structure

```text
├── app.py                  # Flask REST API & session authentication
├── .gitignore              # Excludes secrets, venv, and node_modules
├── README.md               # Project documentation
└── MiniNotesApp/           # React + Vite frontend
    ├── src/
    │   ├── main.jsx
    │   ├── Login.jsx
    │   ├── CreateAccount.jsx
    │   └── Dashboard.jsx
    └── package.json
```

## Setup & Installation

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL

### 2. Environment Variables
Create a `DBcredentials.env` file in the root directory (next to `app.py`) with your local configuration:

```env
SECRET_KEY=your_flask_secret_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
```

### 3. Database Tables
Ensure your PostgreSQL database includes the `users`, `notes`, and `contact_messages` tables:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sender_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    rating INTEGER DEFAULT 5,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Run the Backend (Flask)
From the root directory:

```bash
python -m venv venv
# Activate virtual environment (Windows PowerShell):
.\venv\Scripts\Activate.ps1
pip install flask flask-cors psycopg2-binary python-dotenv werkzeug
python app.py
```
The Flask server runs on `http://127.0.0.1:5000`.

### 5. Run the Frontend (React + Vite)
Open a second terminal inside `MiniNotesApp/`:

```bash
cd MiniNotesApp
npm install
npm run dev -- --host 127.0.0.1
```
Open `http://127.0.0.1:5173/` in your browser.