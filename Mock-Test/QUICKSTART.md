# WebburnsTech Mock Test - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js installed
- MongoDB Atlas account (free tier)
- Redis Cloud account (free tier)
- Resend API account (free tier)

---

## Step 1: Copy Environment File

```bash
cd backend
cp .env.example .env
```

Then edit `.env` with your credentials:

```env
# MongoDB (from MongoDB Atlas)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/webburnstech

# Redis (from Redis Cloud)
REDIS_URL=redis://default:password@host:port

# Resend (from resend.com)
RESEND_API_KEY=re_your_key_here

# Admin Credentials (choose your own)
ADMIN_USERNAME=admin@webburnstech.com
ADMIN_PASSWORD=YourSecurePassword123

# JWT Secret (generate random 32-char string)
JWT_SECRET=your_32_character_secret_here
```

---

## Step 2: Install & Seed

```bash
npm install
npm run seed
```

---

## Step 3: Start Server

```bash
npm run dev
```

Server running at `http://localhost:10000` ✅

---

## Step 4: Test APIs

### Register a User
```bash
curl -X POST http://localhost:10000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "fatherName": "James Doe",
    "motherName": "Jane Doe",
    "dob": "2000-01-01",
    "gender": "male",
    "email": "john@example.com",
    "phone": "1234567890",
    "city": "Mumbai",
    "state": "Maharashtra",
    "terms": true
  }'
```

You'll receive an OTP email!

### Admin Login
```bash
curl -X POST http://localhost:10000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@webburnstech.com",
    "password": "YourSecurePassword123"
  }'
```

---

## 📧 Email Setup (Resend)

1. Go to [resend.com](https://resend.com)
2. Sign up / Login
3. Add & verify domain OR use test domain
4. Get API key from dashboard
5. Add to `.env` as `RESEND_API_KEY`

**Important**: Set `FROM_EMAIL=learn@yourdomain.com` with verified domain

---

## 🗄️ Database Setup

### MongoDB Atlas
1. Create free cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create database user
3. Add IP `0.0.0.0/0` to whitelist (or your IP)
4. Get connection string
5. Add to `.env` as `MONGO_URI`

### Redis Cloud
1. Create free instance at [redis.com/try-free](https://redis.com/try-free)
2. Get connection URL
3. Add to `.env` as `REDIS_URL`

---

## ✅ Health Check

Visit: `http://localhost:10000/health`

Should return:
```json
{
  "success": true,
  "status": "healthy"
}
```

---

## 🎯 Next Steps

1. **Update Frontend URLs**: Point your frontend to `http://localhost:10000`
2. **Test Complete Flow**: Register → Verify OTP → Admin Accept → Login → Exam
3. **Add More Questions**: Edit `scripts/seedQuestions.js` with 75+ questions
4. **Deploy to Cloud**: Use Render, Railway, or Heroku

---

## 📚 Full Documentation

See [README.md](./README.md) for complete documentation.

---

## 🆘 Troubleshooting

**Server won't start?**
- Check all env variables are set
- Verify MongoDB and Redis connections
- Check port 10000 is not in use

**Emails not sending?**
- Verify Resend API key
- Check domain verification
- Look at server logs for errors

**Questions not loading?**
- Run `npm run seed` again
- Check MongoDB connection
- Verify questions collection exists

---

**Ready to go! 🎉**
