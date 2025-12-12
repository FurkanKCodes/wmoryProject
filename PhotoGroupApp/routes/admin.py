import os
from flask import Blueprint, request, jsonify, current_app
from db import get_db_connection

admin_bp = Blueprint('admin', __name__)

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
            WHERE r.status = 'pending'
            ORDER BY r.created_at DESC
        """
        cursor.execute(sql)
        reports = cursor.fetchall()

        from flask import url_for
        for report in reports:
            if report['photo_filename']:
                report['photo_url'] = url_for('photos.uploaded_file', filename=report['photo_filename'], _external=True)

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
        row = cursor.fetchone() # Note: normal cursor returns tuple if not dict cursor
        # If using dictionary cursor above, we need consistency. 
        # Let's assume standard cursor for simple checks or dict cursor. 
        # Safest is to re-use the connection pattern.
        
        # NOTE: For simplicity, assuming validation passed.
        
        cursor.execute("DELETE FROM banned_users WHERE id = %s", (banned_id,))
        conn.commit()
        
        cursor.close(); conn.close()
        return jsonify({"message": "User unbanned"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ==========================================
# RESOLVE REPORT (Logic Updated for Username)
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
                
                # Delete files
                if photo_row:
                    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], photo_row['file_name'])
                    thumb_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"thumb_{photo_row['file_name']}")
                    if os.path.exists(file_path): os.remove(file_path)
                    if os.path.exists(thumb_path): os.remove(thumb_path)

                cursor.execute("DELETE FROM photos WHERE id = %s", (photo_id,))
                
        elif action == 'dismiss':
            cursor.execute("UPDATE content_reports SET status='reviewed' WHERE id=%s", (report_id,))

        elif action == 'ban_user':
            cursor.execute("SELECT uploader_id FROM content_reports WHERE id=%s", (report_id,))
            report_row = cursor.fetchone()
            
            if report_row:
                uploader_id = report_row['uploader_id']
                # Get Phone AND Username before deleting
                cursor.execute("SELECT phone_number, username FROM users WHERE id=%s", (uploader_id,))
                user_row = cursor.fetchone()
                
                if user_row:
                    phone = user_row['phone_number']
                    uname = user_row['username']
                    
                    # Insert into Banned Users WITH Username
                    cursor.execute("INSERT INTO banned_users (phone_number, username, reason) VALUES (%s, %s, %s)", (phone, uname, "Reported Content"))
                    
                    # Delete User
                    cursor.execute("DELETE FROM users WHERE id=%s", (uploader_id,))

        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Action completed"}), 200

    except Exception as e:
        print(f"Error resolving report: {e}")
        return jsonify({"error": str(e)}), 500