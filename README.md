# WMORY — Group-Based Cloud Media Platform

WMORY is a full-stack, production-oriented cloud application that enables users to create private shared galleries with their friends.

It is designed with scalability, security, and modern cloud architecture principles in mind.

---

## 📌 Project Overview

WMORY solves a common social problem:

> Instead of asking “Can you send me the photos?”, users create a shared gallery where everyone uploads once and accesses everything.

The platform is built as a secure, group-based cloud media system using AWS infrastructure and a direct-to-S3 upload pipeline.

---

## 🏗 System Architecture

### Backend
- Python (Flask)
- RESTful API design
- JWT-based authentication (email verification)
- Role-based access control (group membership validation)
- Daily upload quota system (MB-based)
- Rate limiting
- Presigned S3 upload flow
- Asynchronous thumbnail generation
- Dockerized
- CI/CD ready

### Frontend
- React Native (Expo)
- Direct S3 uploads via presigned URLs
- Secure media retrieval
- Group-based media feeds
- Camera integration
- Media gallery interface

---

## ☁ AWS Infrastructure

- AWS EC2 (Dockerized backend hosting)
- AWS RDS MySQL (Managed relational database)
- AWS RDS Proxy (connection pooling layer)
- AWS S3 (media object storage)
- AWS IAM Roles (credential-less secure service access)
- AWS ECR (for CI/CD operation)
- AWS Lambda (thumbnail processing pipeline)

---

## 🔐 Security Architecture

Security was designed as a first-class concern:

- Email-based account verification
- Server-side authorization for all protected routes
- Group membership validation before media operations
- Presigned S3 upload URLs (backend never handles file data)
- Upload size validation and quota enforcement before and after upload
- S3 object prefix restrictions
- No public media exposure
- Private bucket architecture
- Structured audit logging
- Abuse and reporting system

---

## 📂 Media Flow (Optimized Pipeline)

1. Client requests upload authorization
2. Backend validates:
   - Authentication
   - Group membership
   - MIME type
   - File size
   - Daily quota
3. Backend generates presigned S3 URL
4. Client uploads directly to S3
5. Client confirms upload
6. Backend stores metadata in RDS
7. Thumbnail generated asynchronously
8. Media served securely via signed access

Backend is not part of the media transfer path, improving scalability and cost efficiency.

---

## 🧠 Database Design

Relational schema with foreign keys and referential integrity:

Core tables:
- users
- groups
- group_members
- photos
- reports
- audit_logs

Design considerations:
- Ownership and membership validation
- Cascade-safe deletion patterns
- Quota tracking per user
- Moderation and reporting workflow
- Structured logging for traceability

---

## ⚙ Production Readiness

- Managed database (AWS RDS)
- Connection pooling via RDS Proxy
- IAM role-based S3 access
- Environment-based configuration
- Dockerized deployment
- ECR-based CI/CD pipeline
- Zero manual server file edits
- Infrastructure separation (EC2 / RDS / S3)

---

## 🚀 CI/CD Pipeline

Workflow:

1. Push to GitHub
2. GitHub Actions builds Docker image
3. Image pushed to AWS ECR
4. EC2 pulls latest image
5. Container restarts automatically

This ensures version-controlled, reproducible deployments.

---

## 📊 Scalability Considerations

- Direct-to-S3 uploads reduce backend bandwidth usage
- Asynchronous thumbnail generation prevents blocking requests
- RDS Proxy stabilizes DB connection load
- Modular cloud components allow horizontal scaling

---

## 🎯 Engineering Focus

This project demonstrates:

- Secure API design
- Cloud-native architecture
- Cost-aware infrastructure decisions
- Media processing pipelines
- Authentication and authorization enforcement
- Production deployment practices
- CI/CD automation
- Backend–frontend separation of concerns

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

---

## 📌 Status

Beta-ready architecture with production-oriented infrastructure.

Designed for secure, scalable group-based media sharing.

---

## 🎥 Demo

Watch a short demo: [YouTube Link]


## 👨‍💻 Author

Full-stack cloud media platform engineered with AWS-first architecture principles.
