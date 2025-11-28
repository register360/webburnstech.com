# WebburnsTech Mock Test - Backend

A comprehensive Node.js backend for a strict MCQ mock exam platform with MongoDB, Redis, Resend API integration, anti-cheat monitoring, and automated credential scheduling.

## 🚀 Features

- **Registration System**: Email-based registration with OTP verification via Resend API
- **Admin Review**: Admin dashboard to accept/reject applications
- **Automated Credentials**: Scheduled credential sending 2 hours before exam
- **Strict Time Windows**: Registration and exam time enforcement
- **Exam Management**: 75 MCQs with randomized distribution (Python, Java, JS, C, C++, Node.js, Tech)
- **Anti-Cheat System**: Client-side event monitoring with server-side logging and auto-submit after 3 warnings
- **Real-time Answer Saving**: Redis-backed answer caching with MongoDB persistence
- **Session Management**: Single session enforcement per user with JWT + Redis
- **Rate Limiting**: Redis-based rate limiting for all endpoints
- **Audit Logging**: Comprehensive event logging for all critical actions
- **Contact Form**: Priority-based contact form with admin email notifications

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (Atlas recommended)
- Redis (Redis Cloud or local instance)
- Resend API account and API key

## 🛠️ Installation

1. **Clone the repository**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `MONGO_URI`: MongoDB connection string
- `REDIS_URL`: Redis connection URL
- `RESEND_API_KEY`: Your Resend API key
- `FROM_EMAIL`: Sending email address (learn@webburnstech.dev)
- `ADMIN_EMAIL`: Admin notification email
- `JWT_SECRET`: Strong secret key (min 32 characters)
- `ADMIN_USERNAME` & `ADMIN_PASSWORD`: Admin login credentials

4. **Seed questions**

```bash
npm run seed
```

This will populate the database with sample questions. For production, modify `scripts/seedQuestions.js` to load from your own `questions.json` file.

## 🚦 Running the Server

**Development mode (with hot-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:10000` (or your configured PORT).

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/register` | Register new user with OTP | 5 req/15min |
| POST | `/verify-otp` | Verify email OTP | 3 req/15min |
| POST | `/resend-otp` | Resend OTP | 3 req/15min |
| POST | `/login` | Login to exam (time-restricted) | 5 req/15min |
| POST | `/logout` | Logout and clear session | - |

### Exam (`/api/exam`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/questions` | Get 75 randomized questions | ✅ |
| POST | `/attempts/start` | Start new exam attempt | ✅ |
| GET | `/attempts/:id` | Get attempt details (restore) | ✅ |
| POST | `/attempts/:id/save` | Save answer (real-time) | ✅ |
| POST | `/attempts/:id/cheating-event` | Log cheating event | ✅ |
| POST | `/attempts/:id/submit` | Submit exam | ✅ |

### Admin (`/api/admin`)

| Method | Endpoint | Description | Admin Auth |
|--------|----------|-------------|------------|
| POST | `/login` | Admin login | - |
| GET | `/applications` | List all applications | ✅ |
| GET | `/applications/:id` | Get application details | ✅ |
| POST | `/applications/:id/accept` | Accept application & send credentials | ✅ |
| POST | `/applications/:id/reject` | Reject application & send email | ✅ |
| GET | `/attempts` | List all exam attempts | ✅ |
| GET | `/attempts/:id` | Get attempt with cheating logs | ✅ |
| GET | `/stats` | Dashboard statistics | ✅ |

### Contact (`/api/contact`)

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| POST | `/` | Submit contact form | 3 req/hour |

## 📅 Exam Schedule

- **Registration Window**: Nov 27, 2025, 21:00 - Nov 29, 2025, 21:00 IST
- **Credential Send**: Nov 30, 2025, 14:00 IST (automated)
- **Exam Window**: Nov 30, 2025, 16:00 - 18:00 IST (2 hours)

## 🔒 Security Features

- **Helmet**: Security headers
- **CORS**: Configured allowed origins
- **Rate Limiting**: Redis-backed rate limits
- **JWT**: Short-lived tokens (3 hours)
- **Session Enforcement**: Single session per user via Redis
- **Input Validation**: Joi schemas for all endpoints
- **Password Hashing**: bcrypt for exam passwords
- **Audit Logging**: All critical events logged

## 🎯 Anti-Cheat System

Client-side events monitored:
- Tab/window switching
- Copy/paste attempts
- Context menu (right-click)
- DevTools access attempts
- Multiple simultaneous tabs
- Unauthorized focus changes

**Warning System**:
- First event: Warning 1/3
- Second event: Warning 2/3
- Third event: Auto-submit exam with disqualification

All events are logged to `Attempt.cheatingEvents` for admin review.

## 📧 Email Templates

All emails sent via Resend API:

1. **OTP Email**: 6-digit verification code (15-min expiry)
2. **Verification Pending**: Application received confirmation
3. **Credentials Email**: Exam login credentials with instructions
4. **Rejection Email**: Polite rejection with resources
5. **Contact Notification**: Admin notification for contact forms

## 🗂️ Database Schemas

### User
- Registration details, status, OTP, exam password, timestamps
- Status flow: `pending` → `verified` → `accepted`/`rejected`

### Question
- Topic, difficulty, question text, options, correct answer
- Distribution: 40% low, 40% medium, 20% high

### Attempt
- User ID, start/end times, answers, score, cheating events
- Single session key for session enforcement

### Contact
- Name, email, message, priority

### Audit
- User ID, event type, details, IP, timestamp

## ⚙️ Cron Scheduler

Automated credential sending configured for:
```
30 8 30 11 *  (Nov 30, 08:30 UTC = 14:00 IST)
```

Modify in `src/utils/scheduler.js` if needed.

## 🧪 Testing

1. **Test Registration Flow**:
   - Register → Receive OTP email → Verify → Confirmation email

2. **Test Admin Operations**:
   - Login as admin → Accept application → Check credentials sent

3. **Test Exam Flow**:
   - Login during exam window → Start exam → Save answers → Submit

4. **Test Anti-Cheat**:
   - Simulate tab switches → Verify warnings → Check auto-submit

## 🚀 Deployment

### Recommended Platforms
- **Render**: Easy deploy with free tier
- **Railway**: Simple Node.js deployment
- **Heroku**: Supports Redis and MongoDB add-ons
- **DigitalOcean**: App Platform or Droplet

### Environment Setup
1. Set all environment variables in deployment platform
2. Ensure MongoDB Atlas and Redis Cloud are accessible
3. Configure CORS with production frontend URL
4. Set `NODE_ENV=production`

### Post-Deployment
1. Run seed script to populate questions
2. Test all API endpoints
3. Verify email delivery (Resend)
4. Check scheduler is running (credential job)

## 📊 Monitoring

- Check server logs for errors
- Monitor Redis connection health
- Track MongoDB queries performance
- Review audit logs for suspicious activity
- Monitor email delivery status in Resend dashboard

## 🐛 Troubleshooting

**Email not sending?**
- Verify `RESEND_API_KEY` is correct
- Check domain verification in Resend
- Review sender email (`FROM_EMAIL`)

**Redis connection failed?**
- Check `REDIS_URL` format
- Ensure Redis instance is running
- Verify firewall/network access

**MongoDB connection timeout?**
- Check `MONGO_URI` connection string
- Verify IP whitelist in Atlas
- Ensure network connectivity

**Login outside exam window?**
- Verify server timezone configuration
- Check `EXAM_DATE`, `EXAM_START_TIME`, `EXAM_END_TIME` env vars
- Server should handle IST correctly

## 📝 License

MIT License - See LICENSE file for details

## 👥 Support

For issues or questions, contact: webburnstech@gmail.com

---

**Built with ❤️ by WebburnsTech Team**
