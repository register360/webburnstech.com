# 🔗 WebburnsTech API Reference (`API_REFERENCE.md`)

This document provides a comprehensive reference for the various internal and external APIs and services integrated into the WebburnsTech project architecture.

## 1\. Getting Started for Developers

To interact with the backend services, especially the **Developer API Gateway**, you must first acquire a **JWT Token** and/or an **API Key**.

1.  **Authentication:** Use the login endpoint with your credentials to obtain a **JWT Token**.
2.  **Key Generation:** Use the JWT Token to call the `/api/keys/generate` endpoint to provision your persistent developer API Key.
3.  **Integration:** Use the API Key in the `x-api-key` header for all protected endpoints.

<!-- end list -->

```javascript
// Example Node.js: Authenticate and get Token
const loginResponse = await fetch('https://api.webburnstech.dev/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'password' })
});
const { token } = await loginResponse.json();

// Example Node.js: Generate API Key
const keyResponse = await fetch('https://api.webburnstech.dev/api/keys/generate', {
    method: 'POST',
    headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'My-Project-Key', scopes: ['database', 'ai'] })
});
const { key } = await keyResponse.json();
console.log('Your New API Key:', key);
```

-----

## 2\. Internal Microservices (Developer API Gateway)

The Developer API Gateway (`Developer/server.js`) handles user lifecycle, API key management, and proxies demo API endpoints.

### 2.1. Authentication Endpoints

**Base URL:** `https://api.webburnstech.dev` (or Render URL like `https://api-nq5k.onrender.com`)

| Endpoint | Method | Purpose | Auth |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Create new user account (hashes password using bcrypt). | None |
| `/api/auth/login` | `POST` | Authenticate user and return a **JWT Token**. | None |
| `/api/auth/google` | `GET` | Initiates Google OAuth 2.0 flow. | None |
| `/api/auth/github` | `GET` | Initiates GitHub OAuth 2.0 flow. | None |

### 2.2. API Key & Usage Endpoints

| Endpoint | Method | Purpose | Auth | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `/api/keys/generate` | `POST` | Generate a new developer API key with custom scopes. | JWT | Free plan limited to 1 key. |
| `/api/keys` | `GET` | Retrieve list of all user's API keys. | JWT | |
| `/api/keys/:keyId/revoke` | `PATCH` | Revoke a specific API key. | JWT | |
| `/api/usage` | `GET` | Get API usage statistics for the user's keys. | JWT | |

### 2.3. Demo API Endpoints (Requires `x-api-key` Header)

These endpoints are protected by the API Key middleware and validate the required scopes.

| Endpoint | Method | Scope | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/database/records` | `GET` | `database` | Simulate retrieving data from a database. |
| `/api/v1/ai/analyze` | `POST` | `ai` | Simulate AI processing (e.g., sentiment analysis). |
| `/api/v1/server/deploy` | `POST` | `server` | Simulate triggering a server deployment process. |

-----

## 3\. External API Integrations (AI & Mail)

### 3.1. AI API: Mistral AI (Primary Q\&A)

  * **Purpose:** Powers the core Webburns Assistant for company-specific inquiries.
  * **Authentication:** `MISTRAL_API_KEY` environment variable.
  * **Model Used:** `mistral-medium-2505`.
  * **Internal Endpoint:** `/api/ai-assistant` (POST on the dedicated AI service, consumed by the frontend).

#### Example Request (`AI Server/server.js`)

```json
{
    "message": "What services does WebburnsTech offer?"
}
```

#### Example Code Snippet (Mistral)

```javascript
const MistralClient = require('@mistralai/mistralai').default;
const mistral = new MistralClient(process.env.MISTRAL_API_KEY);

const chatResponse = await mistral.chat({
    model: 'mistral-medium-2505',
    messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: req.body.message }
    ]
});
// Response is parsed from chatResponse.choices[0]?.message?.content
```

### 3.2. AI API: DeepSeek (Secondary/General AI)

  * **Purpose:** Provides an alternative general-purpose AI engine for complex tasks (used via the OpenAI SDK wrapper).
  * **Authentication:** `DEEPSEEK_API_KEY` environment variable.
  * **Base URL:** `https://api.deepseek.com`.
  * **Model Used:** `deepseek-chat`.

-----

### 3.3. Mail API: Resend (Contact & Feedback)

  * **Purpose:** High-volume, reliable email sending for contact form confirmations and user feedback responses.
  * **Authentication:** `RESEND_API_KEY` environment variable.
  * **Verified Domain:** `@webburnstech.dev` is configured.

#### Core Email Parameters (Resend)

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `from` | `string` | The sender email address, must use a verified domain (e.g., `contact@webburnstech.dev`). |
| `to` | `string` / `array` | Recipient email address(es). |
| `subject` | `string` | The subject line of the email. |
| `html` | `string` | The HTML body of the email (used for rich templates). |

#### Example Code Snippet (Resend)

```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const adminEmail = await resend.emails.send({
    from: 'WebburnsTech Contact <contact@webburnstech.dev>',
    to: 'webburnstech@gmail.com', // Admin email
    subject: `📧 New Contact: ${subject}`,
    html: `<h1>New Submission from ${name}</h1>` 
});

// Returns successful response data
/*
{
  "data": {
    "id": "e0e377f0-0a56-4279-9943-73130d20d7f4",
    "from": "contact@webburnstech.dev",
    "to": "webburnstech@gmail.com"
  },
  "error": null
}
*/
```

-----

## 4\. Other Key Services

### 4.1. Payment API: Stripe

  * **Purpose:** Secure creation and management of customer payment intents.
  * **Authentication:** `STRIPE_SECRET_KEY` environment variable.
  * **Webhook Security:** Requires `STRIPE_WEBHOOK_SECRET` for verifying incoming event data.
  * **Internal Endpoint:** `/create-payment-intent` (POST).
  * **Webhook Endpoint:** `/webhook` (POST).

| Endpoint | Method | Request Body Parameters | Response |
| :--- | :--- | :--- | :--- |
| `/create-payment-intent` | `POST` | `name`, `email`, `amount` (in dollars). | `{ "clientSecret": "..." }` |

### 4.2. Nodemailer (Job Applications / Portfolio)

  * **Purpose:** Alternative email transport for specific transactional services (Job Applications and Portfolio Contact Forms).
  * **Authentication:** Uses `EMAIL_USER` and `EMAIL_PASS` (e.g., specific Gmail app password) for SMTP.
  * **Job App Service:** Sends confirmation email to the applicant after processing their resume/data.

### 4.3. MongoDB (Mongoose)

  * **Purpose:** Persistent data storage for users, API keys, usage logs, applications, and feedback.
  * **Authentication:** Connection string stored in `MONGODB_URI` environment variable.
  * **Schemas Used:**
      * `User`, `APIKey`, `APIUsage` (`Developer/server.js`)
      * `Application` (`Job server/server.js`)
      * `Feedback` (`Feedback Server/server.js`)

### 4.4. Socket.IO (Real-time Chat/Call)

  * **Purpose:** Real-time bi-directional communication for signaling in WebRTC voice/video calls.
  * **Events Handled:** `join`, `offer`, `answer`, `ice-candidate`, `hangup`, `leave`.

<!-- end list -->

```javascript
// Example Server-side Socket.IO Event Handler
io.on("connection", (socket) => {
    socket.on("offer", ({ roomId, sdp }) => 
        socket.to(roomId).emit("offer", { sdp })
    ); // Simple relay of SDP offer
    // ...
});
```
