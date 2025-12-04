# 📸 Photo Grouping API

A backend API service designed to facilitate photo sharing and grouping among users. This project allows users to join specific groups using unique codes, enabling organized photo management.

## 🚀 Features
* **User Management:** Basic user identification handling.
* **Group Logic:** Functionality for users to join specific photo groups via unique group codes.
* **RESTful API:** Structured endpoints for client-server communication.
* **Error Handling:** Proper status codes and messages for API responses.

## 🛠️ Tech Stack
* **Language:** Python 3.x
* **Framework:** Flask (Microframework for Web Development)
* **Tools:**
    * **Postman:** Used for API testing and documentation.
    * **Git & GitHub:** Version control and collaboration.

## ⚙️ Installation & Setup

Follow these steps to run the project locally on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/FurkanKCodes/Photo-App.git
cd Photo-App
```

### 2. Create a Virtual Environment
It is recommended to use a virtual environment to manage dependencies.

**For Windows:**
```bash
python -m venv venv
.\venv\Scripts\activate
```

**For macOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```
*The server will start at `http://127.0.0.1:5000/`*

## 🔌 API Usage (Example)

You can test the API using Postman or cURL.

### ➤ Join a Group
**Endpoint:** `POST /join-group`

**Request Body (JSON):**
```json
{
  "user_id": 1,
  "group_code": "WBH2FW37"
}
```

**Success Response (200 OK):**
```json
{
  "message": "Joined group successfully",
  "status": "success"
}
```

## 🔮 Future Improvements
* [ ] Integration with a database (PostgreSQL/SQLite) for persistent data storage.
* [ ] Image upload and storage capabilities (AWS S3 or local).
* [ ] User authentication (JWT).
* [ ] Frontend development (React or Mobile App).

## 👤 Authors
**Furkan** - [GitHub Profile](https://github.com/FurkanKCodes)
**Berkay** - [Github Profile](https://github.com/)
**Erdem** - [Github Profile](https://github.com/itu-itis23-ozsevene22)

---
