# WMORY — Group-Based Cloud Media Platform

WMORY is a secure, group-based cloud gallery application that enables users to create private shared media spaces with their friends.

Instead of asking:
“Can you send me the photos?”

Users create one shared gallery — everyone uploads once — everyone has access.

---

## 🎥 Demo

Short demo video:   (Not available)
Live Preview (if available):     (Not available)

---

## 🏗 Architecture

```mermaid
flowchart TD
    User[User]
    Mobile[Mobile App (Expo)]
    Backend[Backend API (Flask on EC2)]
    Proxy[RDS Proxy]
    DB[(AWS RDS MySQL)]
    S3[(AWS S3 Bucket)]
    Lambda[Thumbnail Lambda]

    User --> Mobile
    Mobile -->|Authenticated Requests| Backend
    Backend --> Proxy
    Proxy --> DB

    Mobile -->|Presigned Upload| S3
    S3 -->|ObjectCreated Event| Lambda
    Lambda -->|Generate Thumbnail| S3
```

### Architecture Highlights

- Direct-to-S3 uploads (backend is not in the media data path)
- Managed database (RDS MySQL)
- Connection stabilization via RDS Proxy
- Asynchronous thumbnail generation
- Secure, private media storage
- Dockerized backend deployment
- CI/CD ready infrastructure

---

## 📌 Project Overview

WMORY is designed as a privacy-first shared memory system where:

- Users create private groups
- Members upload photos and videos
- Content is accessible only to authorized group members
- Media is securely stored in AWS infrastructure
- Moderation and reporting mechanisms are enforced server-side

It functions as a controlled, structured cloud storage layer for shared experiences.

---

## 🔐 Security Architecture

Security decisions were treated as first-class engineering concerns:

- Email-based account verification
- Server-side authentication middleware
- Group membership validation before media operations
- Presigned S3 upload URLs
- File type and file size validation
- Daily upload quota enforcement
- Private S3 bucket (no public media exposure)
- Structured audit logging
- Abuse reporting system
- IAM role-based AWS access (no hardcoded credentials)

---

## 📂 Media Processing Flow

1. Client requests upload authorization
2. Backend validates:
   - Authentication
   - Group membership
   - MIME type
   - File size
   - Remaining quota
3. Backend generates presigned S3 upload URL
4. Client uploads directly to S3
5. Client confirms upload
6. Backend stores metadata in RDS
7. S3 event triggers Lambda
8. Lambda generates thumbnail asynchronously
9. Media is served securely via signed access

This architecture removes backend bandwidth bottlenecks and improves scalability.

---

## 🧠 Database Design

Relational schema with foreign keys and referential integrity.

Core tables:

- users
- groups
- group_members
- photos
- reports
- audit_logs

Design principles:

- Strong ownership and membership validation
- Quota tracking per user
- Moderation workflow support
- Structured logging for traceability
- Data consistency via managed relational database

---

## ☁ AWS Infrastructure

- EC2 (Backend Hosting)
- RDS MySQL (Managed Database)
- RDS Proxy (Connection Pooling)
- S3 (Object Storage)
- Lambda (Thumbnail Processing)
- IAM Roles (Secure Access Control)
- ECR (Container Registry)
- CI/CD via GitHub Actions

Infrastructure decisions prioritize security, cost-efficiency, and scalability.

---

## 🚀 CI/CD Pipeline

Workflow:

1. Push to GitHub repository
2. GitHub Actions builds Docker image
3. Image pushed to AWS ECR
4. EC2 pulls latest image
5. Container restarts automatically

This ensures reproducible, version-controlled deployments without manual SSH edits.

---

## 📊 Scalability Considerations

- Backend is removed from file transfer path
- Asynchronous media processing
- Connection pooling with RDS Proxy
- Modular AWS components allow horizontal growth
- Cloud-ready containerized backend

---

## 🛠 Local Development

### Backend

```bash
pip install -r requirements.txt
flask run
```

Required environment variables:

- DB_HOST
- DB_USER
- DB_PASSWORD
- DB_NAME
- AWS_BUCKET_NAME
- AWS_REGION

### Frontend

```bash
npm install
npx expo start
```

Ensure API_URL is correctly configured.

---

## 📎 Key Engineering Decisions

- Direct-to-S3 upload to remove backend bottlenecks
- Server-side authorization enforcement
- Managed relational database instead of NoSQL
- RDS Proxy for connection stability
- IAM-based AWS credential management
- Asynchronous thumbnail pipeline
- Strict separation between media storage and metadata

---

## 👨‍💻 About the Developer

Built as a full-stack cloud media system demonstrating:

- Secure API architecture
- AWS infrastructure management
- Production-grade deployment practices
- CI/CD automation
- Media pipeline optimization
- Privacy-first design

LinkedIn: [Furkan Kösen](https://www.linkedin.com/in/furkan-kösen-3b8604250/) 
Email: (furkankosen22@gmail.com)

---

## 📌 Status

Beta-ready, production-oriented cloud media platform.

Designed for secure and scalable shared memory management.
