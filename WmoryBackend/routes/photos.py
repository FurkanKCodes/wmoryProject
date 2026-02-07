import os
import requests 
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from db import get_db_connection
from PIL import Image, ImageOps
import cv2 
from datetime import datetime
import uuid # Rastgele isim oluşturmak için

# --- S3 HELPER IMPORT ---
from s3_helpers import upload_file_to_s3, get_presigned_url, delete_file_from_s3

photos_bp = Blueprint('photos', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'avi', 'm4v'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- HELPER: PUSH NOTIFICATION ---
def send_expo_push_notification(tokens, title, body, data=None):
    if not tokens: return
    try:
        message = {
            "to": tokens,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {}
        }
        requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=message,
            headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate"}
        )
    except Exception as e:
        print(f"Push notification error: {e}")

# ==========================================
# HELPER: CREATE THUMBNAIL (LOCAL TEMP)
# ==========================================
def create_thumbnail(file_path, filename):
    try:
        size = (300, 300)
        ext = filename.rsplit('.', 1)[1].lower()
        is_video = ext in ['mp4', 'mov', 'avi', 'm4v']
        
        img = None

        if is_video:
            cam = cv2.VideoCapture(file_path)
            ret, frame = cam.read()
            if ret:
                img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            cam.release()
        else:
            img = Image.open(file_path)
            img = ImageOps.exif_transpose(img) 
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')

        if img:
            img.thumbnail(size)
            thumb_filename = f"thumb_{filename}"
            # Save thumbnail to the same local folder temporarily
            thumb_path = os.path.join(os.path.dirname(file_path), thumb_filename)
            img.save(thumb_path, "JPEG", quality=85)
            print(f"Thumbnail created locally: {thumb_filename}")
            return thumb_filename, thumb_path
        else:
            print("Failed to load image or video frame")
            return None, None

    except Exception as e:
        print(f"Thumbnail creation failed: {e}")
        return None, None

# ==========================================
# UPLOAD PHOTO (S3 INTEGRATED)
# ==========================================
@photos_bp.route('/upload-photo', methods=['POST'])
def upload_photo():
    if 'photo' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['photo']
    user_id = request.form.get('user_id')
    group_id = request.form.get('group_id')

    if not file or file.filename == '' or not user_id or not group_id:
        return jsonify({"error": "Missing data"}), 400

    if allowed_file(file.filename):
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)

            # Check membership
            cursor.execute("SELECT id FROM groups_members WHERE user_id = %s AND group_id = %s", (user_id, group_id))
            if not cursor.fetchone():
                cursor.close(); conn.close()
                return jsonify({"error": "You are not a member of this group"}), 403

            # --- LAZY RESET & LIMIT CHECK ---
            ext = file.filename.rsplit('.', 1)[1].lower()
            is_video = ext in ['mp4', 'mov', 'avi', 'm4v']
            today = datetime.utcnow().date()
            
            cursor.execute("SELECT daily_photo_count, daily_video_count, last_upload_date FROM users WHERE id = %s", (user_id,))
            user_stats = cursor.fetchone()
            
            if user_stats:
                db_date = user_stats['last_upload_date']
                if db_date is None or db_date < today:
                    cursor.execute("""
                        UPDATE users 
                        SET daily_photo_count = 0, daily_video_count = 0, last_upload_date = %s 
                        WHERE id = %s
                    """, (today, user_id))
                    conn.commit()
                    current_p_count = 0
                    current_v_count = 0
                else:
                    current_p_count = user_stats['daily_photo_count']
                    current_v_count = user_stats['daily_video_count']

                if is_video and current_v_count >= 2:
                    cursor.close(); conn.close()
                    return jsonify({"error": "LIMIT_EXCEEDED_VIDEO"}), 403
                if not is_video and current_p_count >= 10:
                    cursor.close(); conn.close()
                    return jsonify({"error": "LIMIT_EXCEEDED_PHOTO"}), 403
            # --- END LIMIT CHECK ---

            # 1. GENERATE UNIQUE FILENAME (UUID)
            # Prevent overwrites and make filenames obscure
            unique_name = f"{uuid.uuid4()}.{ext}"
            filename = secure_filename(unique_name)
            
            # 2. SAVE LOCALLY (TEMP)
            upload_folder = current_app.config['UPLOAD_FOLDER']
            save_path = os.path.join(upload_folder, filename)
            file.save(save_path)

            # 3. CREATE THUMBNAIL (TEMP)
            thumb_filename, thumb_path = create_thumbnail(save_path, filename)

            # 4. UPLOAD TO S3
            upload_success = upload_file_to_s3(save_path, filename)
            if thumb_path and os.path.exists(thumb_path):
                upload_file_to_s3(thumb_path, thumb_filename)

            # 5. CLEAN UP LOCAL FILES
            if os.path.exists(save_path): os.remove(save_path)
            if thumb_path and os.path.exists(thumb_path): os.remove(thumb_path)

            if not upload_success:
                cursor.close(); conn.close()
                return jsonify({"error": "Failed to upload to Cloud Storage"}), 500

            # 6. SAVE TO DB (Store only the filename/key, NOT the full URL)
            sql = "INSERT INTO photos (file_name, user_id, group_id, upload_date) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (filename, user_id, group_id, datetime.utcnow()))
            
            # Update Counters
            if is_video:
                cursor.execute("UPDATE users SET daily_video_count = daily_video_count + 1 WHERE id = %s", (user_id,))
            else:
                cursor.execute("UPDATE users SET daily_photo_count = daily_photo_count + 1 WHERE id = %s", (user_id,))
            
            conn.commit()

            # --- NOTIFICATIONS ---
            cursor.execute("SELECT group_name FROM groups_table WHERE id = %s", (group_id,))
            group_row = cursor.fetchone()
            cursor.execute("SELECT username FROM users WHERE id = %s", (user_id,))
            user_row = cursor.fetchone()

            if group_row and user_row:
                group_name = group_row['group_name']
                uploader_name = user_row['username']
                sql_members = """
                    SELECT u.push_token 
                    FROM users u
                    JOIN groups_members gm ON u.id = gm.user_id
                    WHERE gm.group_id = %s AND u.id != %s AND u.push_token IS NOT NULL AND gm.notifications = 1
                """
                cursor.execute(sql_members, (group_id, user_id))
                members = cursor.fetchall()
                tokens = [m['push_token'] for m in members]
                if tokens:
                    title = group_name
                    body = f"{uploader_name}, {group_name} grubuna medya yükledi"
                    data_payload = {"screen": "MediaGallery", "groupId": group_id}
                    send_expo_push_notification(tokens, title, body, data_payload)
            
            cursor.close(); conn.close()
            return jsonify({"message": "File uploaded successfully", "filename": filename}), 201

        except Exception as e:
            print(f"Upload Error: {e}")
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "File type not allowed"}), 400

# ==========================================
# GET GROUP PHOTOS (S3 PRESIGNED URLS)
# ==========================================
@photos_bp.route('/group-photos', methods=['GET'])
def get_group_photos():
    group_id = request.args.get('group_id')
    user_id = request.args.get('user_id')

    if not group_id or not user_id:
        return jsonify({"error": "group_id and user_id are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM groups_members WHERE user_id = %s AND group_id = %s", (user_id, group_id))
        if not cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({"error": "Unauthorized"}), 403

        sql = """
            SELECT photos.id, photos.file_name, photos.upload_date, 
                   photos.user_id as uploader_id, 
                   users.username, users.profile_image
            FROM photos 
            JOIN users ON photos.user_id = users.id 
            WHERE photos.group_id = %s 
            AND photos.id NOT IN (SELECT photo_id FROM hidden_photos WHERE user_id = %s)
            AND photos.user_id NOT IN (
                SELECT blocked_id FROM blocked_users WHERE blocker_id = %s
                UNION
                SELECT blocked_id FROM blocked_users WHERE blocked_id = %s
            )
            ORDER BY photos.upload_date DESC
        """
        cursor.execute(sql, (group_id, user_id, user_id, user_id))
        photos = cursor.fetchall()

        photo_list = []
        for photo in photos:
            filename = photo['file_name']
            thumb_filename = f"thumb_{filename}"
            
            # --- GENERATE PRESIGNED URLS ---
            # This generates a secure, temporary link (valid for 15 mins)
            original_url = get_presigned_url(filename)
            thumbnail_url = get_presigned_url(thumb_filename)
            
            # If generating URL fails (e.g., file deleted manually from S3), use a placeholder or handle gracefully
            if not original_url: 
                original_url = "" # Frontend should handle empty URL
            if not thumbnail_url:
                thumbnail_url = original_url 

            # Handle User Avatar (Profile Pic) Presigned URL
            user_avatar_url = None
            if photo['profile_image']:
                 user_avatar_url = get_presigned_url(photo['profile_image'])
            
            ext = filename.rsplit('.', 1)[1].lower()
            media_type = 'video' if ext in ['mp4', 'mov', 'avi', 'm4v'] else 'image'

            photo_list.append({
                "id": photo['id'],
                "url": original_url,        # S3 Link
                "thumbnail": thumbnail_url, # S3 Link
                "type": media_type,
                "uploader_id": photo['uploader_id'],
                "uploaded_by": photo['username'],
                "user_avatar": user_avatar_url, # S3 Link for avatar
                "date": photo['upload_date'].isoformat() + 'Z'
            })

        cursor.close(); conn.close()
        return jsonify(photo_list), 200
    except Exception as e:
        print(f"Get Photos Error: {e}")
        return jsonify({"error": "Internal Server Error"}), 500

# ==========================================
# BULK ACTION (DELETE FROM S3)
# ==========================================
@photos_bp.route('/bulk-action', methods=['POST'])
def bulk_action():
    data = request.json
    user_id = data.get('user_id')
    photo_ids = data.get('photo_ids') 
    action_type = data.get('action_type')

    if not user_id or not photo_ids or not action_type:
        return jsonify({"error": "Missing fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if action_type == 'hide':
            values = [(user_id, pid) for pid in photo_ids]
            sql = "INSERT IGNORE INTO hidden_photos (user_id, photo_id) VALUES (%s, %s)"
            cursor.executemany(sql, values)
            conn.commit()
            cursor.close(); conn.close()
            return jsonify({"message": "Photos hidden successfully"}), 200

        elif action_type == 'delete':
            # Get filenames BEFORE deleting from DB
            format_strings = ','.join(['%s'] * len(photo_ids))
            cursor.execute(f"SELECT id, file_name, user_id FROM photos WHERE id IN ({format_strings})", tuple(photo_ids))
            photos_to_delete = cursor.fetchall()

            for photo in photos_to_delete:
                if str(photo['user_id']) != str(user_id):
                    cursor.close(); conn.close()
                    return jsonify({"error": "Unauthorized: You do not own all selected photos"}), 403

            # Delete from DB
            cursor.execute(f"DELETE FROM photos WHERE id IN ({format_strings})", tuple(photo_ids))
            conn.commit()

            # Delete from S3
            for photo in photos_to_delete:
                delete_file_from_s3(photo['file_name'])
                delete_file_from_s3(f"thumb_{photo['file_name']}")

            cursor.close(); conn.close()
            return jsonify({"message": "Photos deleted successfully"}), 200

        else:
            return jsonify({"error": "Invalid action type"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ... (hide_photo can use bulk_action, delete_photo needs update below) ...

@photos_bp.route('/delete-photo', methods=['DELETE'])
def delete_photo():
    user_id = request.args.get('user_id')
    photo_id = request.args.get('photo_id')
    if not user_id or not photo_id: return jsonify({"error": "Missing fields"}), 400
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT file_name, user_id FROM photos WHERE id = %s", (photo_id,))
        photo = cursor.fetchone()
        
        if not photo:
            cursor.close(); conn.close(); return jsonify({"error": "Not found"}), 404
        if str(photo['user_id']) != str(user_id):
            cursor.close(); conn.close(); return jsonify({"error": "Unauthorized"}), 403
            
        cursor.execute("DELETE FROM photos WHERE id = %s", (photo_id,))
        conn.commit()
        
        # DELETE FROM S3
        delete_file_from_s3(photo['file_name'])
        delete_file_from_s3(f"thumb_{photo['file_name']}")
        
        cursor.close(); conn.close()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@photos_bp.route('/report-content', methods=['POST'])
def report_content():
    # ... (Same as before, no file changes needed here) ...
    data = request.json
    reporter_id = data.get('reporter_id')
    photo_id = data.get('photo_id')
    reason = data.get('reason')

    if not reporter_id or not photo_id or not reason:
        return jsonify({"error": "Missing fields"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM photos WHERE id = %s", (photo_id,))
        result = cursor.fetchone()
        if not result:
            cursor.close(); conn.close()
            return jsonify({"error": "Photo not found"}), 404
        uploader_id = result[0]
        sql = "INSERT INTO content_reports (reporter_id, uploader_id, photo_id, reason) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql, (reporter_id, uploader_id, photo_id, reason))
        conn.commit()
        cursor.close(); conn.close()
        return jsonify({"message": "Reported successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@photos_bp.route('/hide-photo', methods=['POST'])
def hide_photo():
    return bulk_action() 