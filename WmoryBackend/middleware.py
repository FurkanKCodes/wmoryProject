from functools import wraps
from flask import request, jsonify, g
from firebase_admin import auth
from db import get_db_connection

def login_required(f):
    """
    Decorator to verify Firebase ID Token from the Authorization header.
    Extracts the user's Firebase UID and finds the corresponding SQL User ID.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 1. Check Authorization Header
        token_header = request.headers.get('Authorization')
        if not token_header:
            return jsonify({"error": "Yetkilendirme jetonu (token) eksik."}), 401

        # 2. Extract Token (Remove 'Bearer ' prefix if present)
        try:
            if token_header.startswith("Bearer "):
                token = token_header.split(" ")[1]
            else:
                token = token_header
                
            # 3. Verify Token with Firebase Admin SDK
            decoded_token = auth.verify_id_token(token)
            
            # 4. Attach data to global request context (g)
            g.firebase_uid = decoded_token['uid']
            g.firebase_phone = decoded_token.get('phone_number') # May be None depending on provider
            
            # 5. Look up User in MySQL (Sync Check)
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT id, is_super_admin FROM users WHERE firebase_uid = %s", (g.firebase_uid,))
            user = cursor.fetchone()
            cursor.close()
            conn.close()

            if user:
                g.user_id = user['id']
                g.is_super_admin = user['is_super_admin']
            else:
                # User authenticated in Firebase but not in MySQL yet (e.g., during registration)
                g.user_id = None
                g.is_super_admin = 0

        except ValueError as e:
            return jsonify({"error": "Geçersiz jeton (Invalid Token).", "details": str(e)}), 401
        except Exception as e:
            return jsonify({"error": "Yetkilendirme hatası.", "details": str(e)}), 401

        return f(*args, **kwargs)
    return decorated_function