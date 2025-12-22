import os
import random
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify, current_app, url_for
from db import get_db_connection

admin_bp = Blueprint('admin', __name__)

# --- EMAIL CONFIGURATION (GMAIL SMTP) ---
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "furkankozen22@gmail.com"  
SENDER_PASSWORD = "xjgwmfxgqblniasv" 

def send_verification_email(to_email, code):
    try:
        subject = "Admin Paneli Giriş Kodu"
        body = f"Merhaba Yönetici,\n\nAdmin paneline giriş için doğrulama kodunuz: {code}\n\nBu kod 3 dakika süreyle geçerlidir."

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

# ==========================================
# INITIATE 2FA (Insert into verification_codes)
# ==========================================
@admin_bp.route('/admin/initiate-2fa', methods=['POST'])
def initiate_2fa():
    admin_id = request.json.get('admin_id')

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Check Admin & Get Email
        cursor.execute("SELECT email, is_super_admin FROM users WHERE id = %s", (admin_id,))
        user = cursor.fetchone()

        if not user or user['is_super_admin'] != 1:
            cursor.close(); conn.close()
            return jsonify({"error": "Yetkisiz erişim."}), 403
        
        if not user['email']:
            cursor.close(); conn.close()
            return jsonify({"error": "Kullanıcının kayıtlı e-posta adresi yok."}), 400

        # 2. Generate 6-digit Code
        code = str(random.randint(100000, 999999))
        now = datetime.datetime.now()
        expires_at = now + datetime.timedelta(minutes=3) # Valid for 3 mins

        # 3. Clean old codes for this user & Insert New Code
        cursor.execute("DELETE FROM verification_codes WHERE user_id = %s", (admin_id,))
        
        sql_insert = "INSERT INTO verification_codes (user_id, code, created_at, expires_at) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql_insert, (admin_id, code, now, expires_at))
        
        conn.commit()
        cursor.close(); conn.close()

        # 4. Send Email
        email_sent = send_verification_email(user['email'], code)
        
        if email_sent:
            masked_email = user['email'][0:3] + "****" + user['email'].split('@')[1]
            return jsonify({"message": "Code sent", "email": masked_email}), 200
        else:
            # Mail atılamasa bile test için konsola basıyoruz
            print(f"DEBUG CODE (Mail Failed): {code}")
            return jsonify({"error": "Kod oluşturuldu ancak e-posta gönderilemedi."}), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# VERIFY 2FA CODE (Check verification_codes table)
# ==========================================
@admin_bp.route('/admin/verify-2fa', methods=['POST'])
def verify_2fa():
    data = request.json
    admin_id = data.get('admin_id')
    code = data.get('code')

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Fetch code from verification_codes table
        sql = "SELECT * FROM verification_codes WHERE user_id = %s AND code = %s"
        cursor.execute(sql, (admin_id, code))
        record = cursor.fetchone()

        if not record:
            cursor.close(); conn.close()
            return jsonify({"error": "Hatalı kod."}), 400

        # Check Expiry
        if record['expires_at'] < datetime.datetime.now():
            cursor.close(); conn.close()
            return jsonify({"error": "Kodun süresi dolmuş."}), 400

        # Success - Delete used code
        cursor.execute("DELETE FROM verification_codes WHERE id = %s", (record['id'],))
        conn.commit()
        cursor.close(); conn.close()

        return jsonify({"message": "Verified"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# REPORT CONTENT (User action)
# ==========================================
@admin_bp.route('/report-content', methods=['POST'])
def report_content():
    data = request.json
    reporter_id = data.get('reporter_id')
    photo_id = data.get('photo_id')
    reason = data.get('reason')

    if not reporter_id or not photo_id or not reason:
        return jsonify({"error": "Missing fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Get Uploader ID
        cursor.execute("SELECT user_id FROM photos WHERE id = %s", (photo_id,))
        photo = cursor.fetchone()
        
        if not photo:
            cursor.close(); conn.close()
            return jsonify({"error": "Photo not found"}), 404
        
        uploader_id = photo['user_id']

        # 2. Insert Report
        sql = """
            INSERT INTO content_reports (reporter_id, photo_id, uploader_id, reason)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (reporter_id, photo_id, uploader_id, reason))
        conn.commit()
        
        cursor.close(); conn.close()
        return jsonify({"message": "Report submitted successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# GET REPORTS
# ==========================================
@admin_bp.route('/admin/get-reports', methods=['GET'])
def get_reports():
    admin_id = request.args.get('admin_id')

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check Admin
        cursor.execute("SELECT is_super_admin FROM users WHERE id = %s", (admin_id,))
        user = cursor.fetchone()

        if not user or user['is_super_admin'] != 1:
            cursor.close(); conn.close()
            return jsonify({"error": "Unauthorized"}), 403

        # Fetch Reports
        sql = """
            SELECT 
                r.id as report_id, r.reason, r.status, r.created_at,
                r.reporter_id, u1.username as reporter_username,
                r.uploader_id, u2.username as uploader_username, u2.phone_number as uploader_phone,
                r.photo_id, p.file_name as photo_filename
            FROM content_reports r
            JOIN users u1 ON r.reporter_id = u1.id
            JOIN users u2 ON r.uploader_id = u2.id
            JOIN photos p ON r.photo_id = p.id
            ORDER BY r.created_at DESC
        """
        cursor.execute(sql)
        reports = cursor.fetchall()

        # Video extensions to check
        video_extensions = {'mp4', 'mov', 'avi', 'm4v'}

        for report in reports:
            if report['photo_filename']:
                report['photo_url'] = url_for('photos.uploaded_file', filename=report['photo_filename'], _external=True)
                
                # Determine Media Type
                ext = report['photo_filename'].rsplit('.', 1)[1].lower()
                if ext in video_extensions:
                    report['media_type'] = 'video'
                else:
                    report['media_type'] = 'image'

        cursor.close(); conn.close()
        return jsonify(reports), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# GET BANNED USERS
# ==========================================
@admin_bp.route('/admin/get-banned-users', methods=['GET'])
def get_banned_users():
    admin_id = request.args.get('admin_id')
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check Admin
        cursor.execute("SELECT is_super_admin FROM users WHERE id = %s", (admin_id,))
        user = cursor.fetchone()
        if not user or user['is_super_admin'] != 1:
            cursor.close(); conn.close()
            return jsonify({"error": "Unauthorized"}), 403

        cursor.execute("SELECT * FROM banned_users ORDER BY banned_at DESC")
        banned_users = cursor.fetchall()
        
        cursor.close(); conn.close()
        return jsonify(banned_users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# UNBAN USER
# ==========================================
@admin_bp.route('/admin/unban-user', methods=['POST'])
def unban_user():
    data = request.json
    admin_id = data.get('admin_id')
    banned_id = data.get('banned_id') # ID in banned_users table

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check Admin
        cursor.execute("SELECT is_super_admin FROM users WHERE id = %s", (admin_id,))
        row = cursor.fetchone() 
        
        cursor.execute("DELETE FROM banned_users WHERE id = %s", (banned_id,))
        conn.commit()
        
        cursor.close(); conn.close()
        return jsonify({"message": "User unbanned"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# MANUAL BAN USER
# ==========================================
@admin_bp.route('/admin/manual-ban', methods=['POST'])
def manual_ban():
    data = request.json
    admin_id = data.get('admin_id')
    target_phone = data.get('phone') # Optional
    target_id = data.get('target_id') # Optional

    if not target_phone and not target_id:
        return jsonify({"error": "Phone number or ID required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check Admin
        cursor.execute("SELECT is_super_admin FROM users WHERE id = %s", (admin_id,))
        user = cursor.fetchone()
        if not user or user['is_super_admin'] != 1:
            cursor.close(); conn.close()
            return jsonify({"error": "Unauthorized"}), 403

        # Find Target User
        target_user = None
        if target_id:
            cursor.execute("SELECT * FROM users WHERE id = %s", (target_id,))
            target_user = cursor.fetchone()
        elif target_phone:
            cursor.execute("SELECT * FROM users WHERE phone_number = %s", (target_phone,))
            target_user = cursor.fetchone()

        if not target_user:
            cursor.close(); conn.close()
            return jsonify({"error": "User not found"}), 404

        # Execute Ban Logic
        phone = target_user['phone_number']
        uname = target_user['username']
        uid = target_user['id']

        if str(uid) == str(admin_id):
            cursor.close(); conn.close()
            return jsonify({"error": "Cannot ban yourself"}), 400

        cursor.execute("INSERT INTO banned_users (phone_number, username, reason) VALUES (%s, %s, %s)", (phone, uname, "Manual Ban by Admin"))
        cursor.execute("DELETE FROM users WHERE id=%s", (uid,))

        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "User banned and deleted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# RESOLVE REPORT
# ==========================================
@admin_bp.route('/admin/resolve-report', methods=['POST'])
def resolve_report():
    data = request.json
    admin_id = data.get('admin_id')
    report_id = data.get('report_id')
    action = data.get('action') 

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT is_super_admin FROM users WHERE id = %s", (admin_id,))
        user = cursor.fetchone()
        if not user or user['is_super_admin'] != 1:
            cursor.close(); conn.close()
            return jsonify({"error": "Unauthorized"}), 403

        if action == 'delete_content':
            cursor.execute("SELECT photo_id FROM content_reports WHERE id=%s", (report_id,))
            row = cursor.fetchone()
            if row:
                photo_id = row['photo_id']
                cursor.execute("SELECT file_name FROM photos WHERE id=%s", (photo_id,))
                photo_row = cursor.fetchone()
                
                if photo_row:
                    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], photo_row['file_name'])
                    thumb_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"thumb_{photo_row['file_name']}")
                    if os.path.exists(file_path): os.remove(file_path)
                    if os.path.exists(thumb_path): os.remove(thumb_path)

                cursor.execute("DELETE FROM photos WHERE id = %s", (photo_id,))
                cursor.execute("DELETE FROM content_reports WHERE id=%s", (report_id,))
                
        elif action == 'dismiss':
            cursor.execute("DELETE FROM content_reports WHERE id=%s", (report_id,))

        elif action == 'ban_user':
            cursor.execute("SELECT uploader_id FROM content_reports WHERE id=%s", (report_id,))
            report_row = cursor.fetchone()
            
            if report_row:
                uploader_id = report_row['uploader_id']
                cursor.execute("SELECT phone_number, username FROM users WHERE id=%s", (uploader_id,))
                user_row = cursor.fetchone()
                
                if user_row:
                    phone = user_row['phone_number']
                    uname = user_row['username']
                    
                    cursor.execute("INSERT INTO banned_users (phone_number, username, reason) VALUES (%s, %s, %s)", (phone, uname, "Reported Content"))
                    cursor.execute("DELETE FROM users WHERE id=%s", (uploader_id,))
                    cursor.execute("DELETE FROM content_reports WHERE id=%s", (report_id,))

        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Action completed"}), 200

    except Exception as e:
        print(f"Error resolving report: {e}")
        return jsonify({"error": str(e)}), 500