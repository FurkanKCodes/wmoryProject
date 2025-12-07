import os
import string
import random
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from db import get_db_connection

# Define the Blueprint for group operations
groups_bp = Blueprint('groups', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_group_code():
    """Generates a random 8-character alphanumeric code."""
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choices(characters, k=8))

# ==========================================
# CREATE GROUP (UPDATED with Image Upload)
# ==========================================
@groups_bp.route('/create-group', methods=['POST'])
def create_group():
    # NOT: Resim yükleme olduğu için artık request.json KULLANILMAZ.
    # request.form ve request.files kullanılır.

    user_id = request.form.get('user_id')
    group_name = request.form.get('group_name')

    # Validation
    if not user_id or not group_name:
        return jsonify({"error": "user_id and group_name are required"}), 400

    # Resim İşlemleri
    picture_filename = None
    if 'picture' in request.files:
        file = request.files['picture']
        if file and file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Çakışmayı önlemek için ismin başına rastgele kod ekleyelim
            unique_name = f"{generate_group_code()}_{filename}"
            
            # app.py'de tanımlanan upload klasörüne kaydet
            upload_path = current_app.config['UPLOAD_FOLDER']
            file.save(os.path.join(upload_path, unique_name))
            picture_filename = unique_name

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Generate Unique Code
        new_code = ""
        while True:
            new_code = generate_group_code()
            cursor.execute("SELECT id FROM groups_table WHERE group_code = %s", (new_code,))
            if cursor.fetchone() is None:
                break 

        # 1. Insert new group (Updated with picture)
        sql_group = "INSERT INTO groups_table (group_code, created_by, group_name, picture) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql_group, (new_code, user_id, group_name, picture_filename))
        group_id = cursor.lastrowid 

        # 2. Add creator as Admin Member
        sql_member = "INSERT INTO groups_members (user_id, group_id, is_admin) VALUES (%s, %s, %s)"
        cursor.execute(sql_member, (user_id, group_id, 1))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "status": "success",
            "message": "Grup başarıyla oluşturuldu",
            "group_code": new_code,
            "group_id": group_id,
            "group_name": group_name,
            "picture": picture_filename
        }), 201

    except Exception as e:
        print(f"Error creating group: {e}") 
        return jsonify({"status": "error", "message": "Sunucu hatası: " + str(e)}), 500

# ==========================================
# JOIN GROUP (UNCHANGED)
# ==========================================
@groups_bp.route('/join-group', methods=['POST'])
def join_group():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415
        
    data = request.json
    user_id = data.get('user_id')
    code = data.get('group_code') # Frontend 'group_code' göndermeli

    if not user_id or not code:
        return jsonify({"error": "user_id and group_code are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Find group
        cursor.execute("SELECT id, group_name FROM groups_table WHERE group_code = %s", (code,))
        group_row = cursor.fetchone()

        if not group_row:
            cursor.close()
            conn.close()
            return jsonify({"error": "Grup bulunamadı"}), 404
        
        group_id = group_row['id']
        group_name = group_row['group_name']

        # 2. Check existing membership
        cursor.execute(
            "SELECT id FROM groups_members WHERE user_id = %s AND group_id = %s", 
            (user_id, group_id)
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"message": "Zaten bu grubun üyesisiniz"}), 409

        # 3. Add member
        sql = "INSERT INTO groups_members (user_id, group_id) VALUES (%s, %s)"
        cursor.execute(sql, (user_id, group_id))
        conn.commit()
        
        cursor.close()
        conn.close()

        return jsonify({
            "status": "success", 
            "message": "Gruba başarıyla katıldınız",
            "group_id": group_id,
            "group_name": group_name
        }), 200

    except Exception as e:
        print(f"Error joining group: {e}")
        return jsonify({"status": "error", "message": "Sunucu hatası"}), 500

# ==========================================
# GET USER GROUPS (Updated SELECT)
# ==========================================
@groups_bp.route('/my-groups', methods=['GET'])
def get_user_groups():
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # picture sütununu da çekiyoruz
        sql = """
            SELECT g.id, g.group_name, g.group_code, g.picture, gm.is_admin
            FROM groups_table g
            JOIN groups_members gm ON g.id = gm.group_id
            WHERE gm.user_id = %s
            ORDER BY gm.joined_at DESC
        """
        cursor.execute(sql, (user_id,))
        groups = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(groups), 200

    except Exception as e:
        print(f"Error fetching groups: {e}")
        return jsonify({"error": "Sunucu hatası"}), 500

# ==========================================
# SERVE UPLOADED IMAGES
# ==========================================
@groups_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)