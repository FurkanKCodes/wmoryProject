import os
import firebase_admin 
from flask import Flask
from flask_cors import CORS
from routes.auth import auth_bp
from routes.groups import groups_bp
from routes.photos import photos_bp
from routes.admin import admin_bp  
from firebase_admin import credentials 

app = Flask(__name__)
CORS(app) # Allow mobile app connection


# =====================================================
# FIREBASE INITIALIZATION (SECURITY)
# =====================================================
# Ensure 'serviceAccountKey.json' is in the root directory
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
# =====================================================

# =====================================================
# CONFIGURATION
# =====================================================
# Define the folder where uploaded photos will be stored
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')

# Create the folder if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# =====================================================
# REGISTER BLUEPRINTS
# =====================================================
# Connect all the separate route files to the main app
app.register_blueprint(auth_bp)
app.register_blueprint(groups_bp)
app.register_blueprint(photos_bp)
app.register_blueprint(admin_bp)

@app.route('/')
def index():
    return "Backend is running! Auth, Groups, Photos and Admin are ready."

if __name__ == '__main__':
    # Run the server accessible to the network
    app.run(debug=True, host='0.0.0.0', port=5000)