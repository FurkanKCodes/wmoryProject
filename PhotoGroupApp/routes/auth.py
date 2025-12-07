from flask import Blueprint, request, jsonify
from db import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash

# Define the Blueprint for authentication routes
auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    # Ensure the request Content-Type is application/json
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.json
    
    # Extract fields
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    phone_number = data.get('phone_number')

    # Validate required fields
    if not username or not email or not password or not phone_number:
        return jsonify({"error": "Username, email, password AND phone_number are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Check if email or username already exists
        cursor.execute("SELECT id FROM users WHERE email = %s OR username = %s", (email, username))
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            return jsonify({"message": "User with this email or username already exists"}), 409

        # 2. Hash the password
        hashed_password = generate_password_hash(password)

        # 3. Create a new user
        sql = """
            INSERT INTO users (username, email, password_hash, phone_number) 
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(sql, (username, email, hashed_password, phone_number))
        conn.commit()
        
        new_user_id = cursor.lastrowid
        
        cursor.close()
        conn.close()

        return jsonify({
            "message": "User registered successfully", 
            "user_id": new_user_id
        }), 201

    except Exception as e:
        print(f"Error during register: {e}")
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    if not request.is_json:
        return jsonify({"error": "Content-Type must be application/json"}), 415

    data = request.json
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        conn = get_db_connection()
        # Use dictionary cursor to access fields by name
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()

        if user and check_password_hash(user['password_hash'], password):
            # DÜZELTİLEN KISIM: user_id direkt ana objede dönüyor
            return jsonify({
                "message": "Login successful",
                "user_id": user['id'],
                "username": user['username']
            }), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401

    except Exception as e:
        print(f"Error during login: {e}")
        return jsonify({"error": str(e)}), 500