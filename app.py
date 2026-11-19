import os
import re
import psycopg2
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

load_dotenv("DBcredentials.env")

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

CORS(app,
    supports_credentials=True,
    origins=["http://localhost:5173", "http://127.0.0.1:5173"],)  # Allows your React app to send requests to Flask


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


@app.route("/")
def home():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM users")
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return f"Flask is running. Users in DB: {count}"

# <--- THE /api/createaccount ROUTE --->
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    first_name = data.get("firstName", "").strip()
    last_name = data.get("lastName", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not first_name or not last_name or not email or not password:
        return jsonify({"error": "All fields are required."}), 400

    # Hash the password before saving to PostgreSQL
    hashed_password = generate_password_hash(password)

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Check if the email/username already exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({"error": "An account with this email already exists."}), 409

        # Insert the new user (adjust column names if your table uses different ones)
        cur.execute(
            """
            INSERT INTO users (first_name, last_name, email, password)
            VALUES (%s, %s, %s, %s)
            RETURNING id, first_name, last_name, email, is_admin
            """,
            (first_name, last_name, email, hashed_password),
        )
        new_user_id = cur.fetchone()[0]
        conn.commit()

        return jsonify({
            "message": "Account created successfully!",
            "userId": new_user_id,
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# <--- THE /api/login ROUTE --->
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "All fields are required. Please fill in every box."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT id, first_name, last_name, email, password, is_admin FROM users WHERE email = %s",
            (email,),
        )
        user = cur.fetchone()

        if not user or not check_password_hash(user[4], password):
            return jsonify({"error": "Invalid email address or password."}), 401

        # To store the user's ID in Flask's server-side session,
        # which automatically sends the signed session cookie to the browser
        session.clear()
        session["user_id"] = user[0]
        session["is_admin"] = bool(user[5])

        return jsonify({
            "message": "Login successful!",
            "user": {
                "id": user[0],
                "firstName": user[1],
                "lastName": user[2],
                "email": user[3],
                "isAdmin": user[5],
            },
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# <--- LOGOUT (Clears the browser session cookie) --->
# Logging out destroys the browser session cookie
@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully."}), 200

# <--- CHECK ACTIVE SESSION COOKIE --->
# The dashboard can verify that a valid cookie session exists
@app.route("/api/session", methods=["GET"])
def check_session():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"authenticated": False}), 401
    return jsonify({
        "authenticated": True,
        "user_id": user_id,
        "is_admin": session.get("is_admin", False),
    }), 200

# <--- Format Note Date helper --->
def format_note_date(dt):
    if not dt:
        return "Today"
    return f"{dt.strftime('%b %d, %Y')} • {dt.strftime('%I:%M %p').lstrip('0')}"

# <--- THE /api/Get or Display Notes ROUTE --->
@app.route("/api/notes/<int:user_id>", methods=["GET"])
def get_notes(user_id):
    session_user_id = session.get("user_id")
    if not session_user_id or int(session_user_id) != user_id:
        return jsonify({"error": "Unauthorized access."}), 403

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id, title, content, updated_at
            FROM notes
            WHERE user_id = %s
            ORDER BY updated_at DESC, id DESC
            """,
            (user_id,),
        )
        rows = cur.fetchall()

        notes_list = [
            {
                "id": row[0],
                "title": row[1],
                "content": row[2],
                "date": format_note_date(row[3]),
            }
            for row in rows
        ]

        return jsonify(notes_list), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# <--- THE /api/Post or Add Notes ROUTE --->
@app.route("/api/notes", methods=["POST"])
def create_note():
    session_user_id = session.get("user_id")
    if not session_user_id:
        return jsonify({"error": "Unauthorized access."}), 401

    data = request.get_json()
    user_id = data.get("user_id")
    title = data.get("title", "").strip() or "Untitled"
    content = data.get("content", "").strip()

    if not user_id:
        return jsonify({"error": "User ID is required."}), 400

    if not content:
        return jsonify({"error": "Note content cannot be empty."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO notes (user_id, title, content)
            VALUES (%s, %s, %s)
            RETURNING id, title, content, updated_at
            """,
            (user_id, title, content),
        )
        new_row = cur.fetchone()
        conn.commit()

        return jsonify({
            "id": new_row[0],
            "title": new_row[1],
            "content": new_row[2],
            "date": format_note_date(new_row[3]),
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# <--- THE /api/Put or Edit Notes ROUTE --->
@app.route("/api/notes/<int:note_id>", methods=["PUT"])
def update_note(note_id):
    session_user_id = session.get("user_id")
    if not session_user_id:
        return jsonify({"error": "Unauthorized access."}), 401

    data = request.get_json()
    title = data.get("title", "").strip() or "Untitled"
    content = data.get("content", "").strip()

    if not content:
        return jsonify({"error": "Note content cannot be empty."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            UPDATE notes
            SET title = %s,
                content = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND user_id = %s
            RETURNING id, title, content, updated_at
            """,
            (title, content, note_id, session_user_id),
        )
        updated_row = cur.fetchone()
        conn.commit()

        if not updated_row:
            return jsonify({"error": "Note not found."}), 404

        return jsonify({
            "id": updated_row[0],
            "title": updated_row[1],
            "content": updated_row[2],
            "date": format_note_date(updated_row[3]),
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# <--- THE /api/Delete Notes ROUTE --->
@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
    session_user_id = session.get("user_id")
    if not session_user_id:
        return jsonify({"error": "Unauthorized access."}), 401

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "DELETE FROM notes WHERE id = %s AND user_id = %s RETURNING id",
            (note_id, session_user_id),
        )
        deleted_row = cur.fetchone()
        conn.commit()

        if not deleted_row:
            return jsonify({"error": "Note not found."}), 404

        return jsonify({"message": "Note deleted successfully.", "id": deleted_row[0]}), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# <--- THE /api/users/<id> Account Update ROUTE --->
@app.route("/api/users/<int:user_id>", methods=["PUT"])
def update_user_account(user_id):
    session_user_id = session.get("user_id")
    if not session_user_id or int(session_user_id) != user_id:
        return jsonify({"error": "Unauthorized access."}), 403

    data = request.get_json()
    first_name = data.get("firstName", "").strip()
    last_name = data.get("lastName", "").strip()
    new_password = data.get("password", "")

    if not first_name or not last_name:
        return jsonify({"error": "First name and last name are required."}), 400

    if len(new_password) > 0:
        password_pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
        if not re.match(password_pattern, new_password):
            return jsonify({
                "error": "Password must be at least 8 characters long and include: 1 Uppercase, 1 Lowercase, 1 Number, and 1 Symbol (@$!%*?&)."
            }), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if len(new_password) > 0:
            cur.execute("SELECT password FROM users WHERE id = %s", (session_user_id,))
            existing_user = cur.fetchone()

            if not existing_user:
                return jsonify({"error": "User not found."}), 404

            if check_password_hash(existing_user[0], new_password):
                return jsonify({
                    "error": "New password cannot be the same as your current password."
                }), 400

            hashed_pw = generate_password_hash(new_password)
            cur.execute(
                """
                UPDATE users
                SET first_name = %s, last_name = %s, password = %s
                WHERE id = %s
                RETURNING id, first_name, last_name, email, is_admin
                """,
                (first_name, last_name, hashed_pw, session_user_id),
            )
        else:
            cur.execute(
                """
                UPDATE users
                SET first_name = %s, last_name = %s
                WHERE id = %s
                RETURNING id, first_name, last_name, email, is_admin
                """,
                (first_name, last_name, session_user_id),
            )

        updated_user = cur.fetchone()
        conn.commit()

        if not updated_user:
            return jsonify({"error": "User not found."}), 404

        return jsonify({
            "message": "Account updated successfully!",
            "user": {
                "id": updated_user[0],
                "firstName": updated_user[1],
                "lastName": updated_user[2],
                "email": updated_user[3],
                "isAdmin": updated_user[4],
            },
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# <--- THE /api/Feedback Get or Display ROUTE --->
@app.route("/api/feedback", methods=["GET"])
def get_feedback():
    user_id = session.get("user_id") or request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized access."}), 403

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()

        if not user or not user[0]:
            return jsonify({"error": "Admin access required."}), 403

        cur.execute(
            """
            SELECT id, sender_name, email, subject, rating, message, created_at
            FROM contact_messages
            ORDER BY created_at DESC, id DESC
            """
        )
        rows = cur.fetchall()

        feedback_list = [
            {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "subject": row[3],
                "rating": row[4],
                "message": row[5],
                "date": (
                    f"{row[6].strftime('%B %d, %Y')} {row[6].strftime('%I:%M %p').lstrip('0')}"
                    if row[6]
                    else "Just now"
                ),
            }
            for row in rows
        ]

        return jsonify(feedback_list), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# <--- THE /api/Feedback Post or Submit ROUTE --->
@app.route("/api/feedback", methods=["POST"])
def create_feedback():
    data = request.get_json()
    user_id = data.get("user_id")
    sender_name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    subject = data.get("subject", "").strip()
    message = data.get("message", "").strip()
    rating = data.get("rating", 5)

    if not user_id:
        return jsonify({"error": "User ID is required."}), 400

    if not sender_name or not email or not subject or not message:
        return jsonify({"error": "Name, email, subject, and message cannot be empty."}), 400

    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            """
            INSERT INTO contact_messages (user_id, sender_name, email, subject, rating, message)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, sender_name, email, subject, rating, message, created_at
            """,
            (user_id, sender_name, email, subject, rating, message),
        )
        new_row = cur.fetchone()
        conn.commit()

        return jsonify({
            "id": new_row[0],
            "name": new_row[1],
            "email": new_row[2],
            "subject": new_row[3],
            "rating": new_row[4],
            "message": new_row[5],
            "date": (
                f"{new_row[6].strftime('%B %d, %Y')} {new_row[6].strftime('%I:%M %p').lstrip('0')}"
                if new_row[6]
                else "Just now"
            ),
        }), 201

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    app.run(debug=True, port=5000)