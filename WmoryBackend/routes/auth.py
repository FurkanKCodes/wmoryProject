import os
import string
import random
import datetime
import smtplib
from flask import Blueprint, request, jsonify, current_app, url_for
from db import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from PIL import Image
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint('auth', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# --- EMAIL CONFIGURATION ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "info@wmory.com" 
SENDER_PASSWORD = os.getenv("INFO_MAIL_PASSWORD")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- THUMBNAIL HELPER ---
def create_thumbnail(image_path, filename):
    try:
        size = (300, 300)
        with Image.open(image_path) as img:
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            img.thumbnail(size)
            thumb_path = os.path.join(os.path.dirname(image_path), f"thumb_{filename}")
            img.save(thumb_path, "JPEG", quality=85)
    except Exception as e:
        print(f"Thumbnail error: {e}")

# --- HELPER: SEND EMAIL ---
def send_email(to_email, code, process_type):
    if not SENDER_PASSWORD:
        print("Error: INFO_MAIL_PASSWORD not found in .env")
        return False

    try:
        subject = f"WMORY - {process_type.capitalize()} Kodu"
        body = f"Merhaba,\n\nWMORY uygulaması için doğrulama kodunuz: {code}\n\nBu kod 3 dakika süreyle geçerlidir."

        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, to_email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"Email sending error: {e}")
        return False


# 1. SEND VERIFICATION CODE (LOGIN & REGISTER)
@auth_bp.route('/send-code', methods=['POST'])
def send_code():
    """
    Generates a 6-digit code and sends it via email.
    checks if user exists based on 'type' (login vs register).
    """
    if not request.is_json:
        return jsonify({"error": "JSON formatı gerekli"}), 415

    data = request.json
    email = data.get('email')
    process_type = data.get('type') # 'login' or 'register' or 'update'

    if not email or process_type not in ['login', 'register', 'update']:
        return jsonify({"error": "Geçerli bir email ve işlem tipi (login/register) gerekli."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check user existence
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        # Logic: If login, user MUST exist. If register, user MUST NOT exist.
        if process_type == 'login' and not user:
            cursor.close(); conn.close()
            return jsonify({"error": "Bu e-posta ile kayıtlı kullanıcı bulunamadı."}), 404
        
        if process_type == 'register' and user:
            cursor.close(); conn.close()
            return jsonify({"error": "Bu e-posta zaten kayıtlı. Lütfen giriş yapın."}), 409

        if process_type == 'update' and user:
            cursor.close(); conn.close()
            return jsonify({"error": "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor."}), 409

        # Generate Code
        code = ''.join(random.choices(string.digits, k=6))
        expires_at = datetime.datetime.now() + datetime.timedelta(minutes=3)

        # Save to DB (UPDATED TABLE NAME: email_verification_codes)
        cursor.execute("DELETE FROM email_verification_codes WHERE email = %s AND type = %s", (email, process_type))
        cursor.execute(
            "INSERT INTO email_verification_codes (email, code, type, expires_at) VALUES (%s, %s, %s, %s)",
            (email, code, process_type, expires_at)
        )
        conn.commit()
        cursor.close(); conn.close()

        # Send Email
        if send_email(email, code, process_type):
            return jsonify({"message": "Doğrulama kodu gönderildi."}), 200
        else:
            return jsonify({"error": "Kod gönderilemedi. Lütfen tekrar deneyin."}), 500

    except Exception as e:
        print(f"Error in send-code: {e}")
        return jsonify({"error": str(e)}), 500


@auth_bp.route('/verify-register', methods=['POST'])
def verify_register():
    """
    Verifies code and creates a new user without password.
    """
    if not request.is_json:
        return jsonify({"error": "JSON formatı gerekli"}), 415
        
    data = request.json
    email = data.get('email')
    code = data.get('code')
    username = data.get('username')
    phone_number = data.get('phone_number') # Optional but good to keep
    
    if not email or not code or not username:
        return jsonify({"error": "Eksik bilgi."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check Code
        cursor.execute(
            "SELECT * FROM email_verification_codes WHERE email=%s AND code=%s AND type='register' AND expires_at > NOW()", 
            (email, code)
        )
        valid_code = cursor.fetchone()

        if not valid_code:
            cursor.close(); conn.close()
            return jsonify({"error": "Geçersiz veya süresi dolmuş kod."}), 400

        # Create User (NO PASSWORD COLUMN)
        try:
            sql = "INSERT INTO users (username, email, phone_number) VALUES (%s, %s, %s)"
            cursor.execute(sql, (username, email, phone_number))
            conn.commit()
            new_user_id = cursor.lastrowid
            
            # Delete used code
            cursor.execute("DELETE FROM email_verification_codes WHERE email=%s", (email,))
            conn.commit()
            
            cursor.close(); conn.close()
            return jsonify({"message": "Kayıt başarılı!", "user_id": new_user_id}), 201
            
        except Exception as db_err:
            cursor.close(); conn.close()
            print(f"DB Error: {db_err}")
            return jsonify({"error": "Bu telefon numarası veya e-posta zaten kullanımda."}), 409

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 3. VERIFY CODE & LOGIN
@auth_bp.route('/verify-login', methods=['POST'])
def verify_login():
    """
    Verifies code and logs the user in.
    """
    data = request.json
    email = data.get('email')
    code = data.get('code')

    if not email or not code:
        return jsonify({"error": "Email ve kod gerekli."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check Code (UPDATED TABLE NAME)
        cursor.execute(
            "SELECT * FROM email_verification_codes WHERE email=%s AND code=%s AND type='login' AND expires_at > NOW()", 
            (email, code)
        )
        valid_code = cursor.fetchone()

        if not valid_code:
            cursor.close(); conn.close()
            return jsonify({"error": "Geçersiz veya süresi dolmuş kod."}), 400

        # Get User Info
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        # Delete used code (UPDATED TABLE NAME)
        cursor.execute("DELETE FROM email_verification_codes WHERE email=%s", (email,))
        conn.commit()
        
        cursor.close(); conn.close()

        if user:
            # Generate profile URLs
            profile_url = None
            thumb_url = None
            if user['profile_image']:
                profile_url = url_for('groups.uploaded_file', filename=user['profile_image'], _external=True)
                thumb_url = url_for('groups.uploaded_file', filename=f"thumb_{user['profile_image']}", _external=True)

            return jsonify({
                "message": "Giriş başarılı.",
                "user_id": user['id'],
                "username": user['username'],
                "is_super_admin": user['is_super_admin'],
                "profile_image": user['profile_image'],
                "profile_url": profile_url,
                "thumbnail_url": thumb_url
            }), 200
        else:
            return jsonify({"error": "Kullanıcı bulunamadı."}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# GENERIC VERIFY CODE(update)
@auth_bp.route('/verify-code', methods=['POST'])
def verify_code():
    """
    Verifies the code for 'update' process without changing user data yet.
    """
    data = request.json
    email = data.get('email')
    code = data.get('code')
    process_type = data.get('type') # Should be 'update'

    if not email or not code:
        return jsonify({"error": "Email ve kod gerekli."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check Code
        cursor.execute(
            "SELECT * FROM email_verification_codes WHERE email=%s AND code=%s AND type=%s AND expires_at > NOW()", 
            (email, code, process_type)
        )
        valid_code = cursor.fetchone()

        if not valid_code:
            cursor.close(); conn.close()
            return jsonify({"error": "Geçersiz veya süresi dolmuş kod."}), 400
        
        # Delete used code immediately to prevent replay
        cursor.execute("DELETE FROM email_verification_codes WHERE email=%s AND type=%s", (email, process_type))
        conn.commit()
        cursor.close(); conn.close()

        return jsonify({"message": "Kod doğrulandı."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/get-user', methods=['GET'])
def get_user():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # ADDED is_super_admin to SELECT
        cursor.execute("""
            SELECT id, username, email, phone_number, profile_image, is_super_admin, 
                   plan, daily_photo_count, daily_video_count, last_upload_date 
            FROM users WHERE id = %s
        """, (user_id,))
        user = cursor.fetchone()
        
        # Add URLs
        if user and user['profile_image']:
            user['profile_url'] = url_for('groups.uploaded_file', filename=user['profile_image'], _external=True)
            user['thumbnail_url'] = url_for('groups.uploaded_file', filename=f"thumb_{user['profile_image']}", _external=True)
        else:
            user['profile_url'] = None
            user['thumbnail_url'] = None

        cursor.close()
        conn.close()

        if user:
            return jsonify(user), 200
        else:
            return jsonify({"error": "User not found"}), 404

    except Exception as e:
        print(f"Error fetching user: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/update-profile', methods=['POST'])
def update_profile():
    try:
        user_id = request.form.get('user_id')
        username = request.form.get('username')
        email = request.form.get('email')
        phone_number = request.form.get('phone_number')

        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        picture_filename = None
        if 'profile_image' in request.files:
            file = request.files['profile_image']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_name = f"user_{user_id}_{random.randint(1000,9999)}_{filename}"
                
                upload_path = current_app.config['UPLOAD_FOLDER']
                save_path = os.path.join(upload_path, unique_name)
                
                # 1. Save Original
                file.save(save_path)
                
                # 2. Generate Thumbnail
                create_thumbnail(save_path, unique_name)
                
                picture_filename = unique_name

        conn = get_db_connection()
        cursor = conn.cursor()

        query = "UPDATE users SET username=%s, email=%s, phone_number=%s"
        params = [username, email, phone_number]

        if picture_filename:
            query += ", profile_image=%s"
            params.append(picture_filename)

        query += " WHERE id=%s"
        params.append(user_id)

        cursor.execute(query, tuple(params))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Profile updated successfully"}), 200

    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/delete-account', methods=['DELETE'])
def delete_account():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM groups_members WHERE user_id = %s", (user_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Account deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting account: {e}")
        return jsonify({"error": str(e)}), 500


# ==========================================
# UPDATE PUSH TOKEN
# ==========================================
@auth_bp.route('/update-push-token', methods=['POST'])
def update_push_token():
    data = request.json
    user_id = data.get('user_id')
    push_token = data.get('push_token')

    if not user_id or not push_token:
        return jsonify({"error": "Missing fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Save the token to the database
        cursor.execute("UPDATE users SET push_token = %s WHERE id = %s", (push_token, user_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Token updated"}), 200
    except Exception as e:
        print(f"Token update error: {e}")
        return jsonify({"error": str(e)}), 500

