# Presidential Chauffeurs API

This is the production-ready API for the Presidential Chauffeurs website. It handles vehicle inquiries and email notifications.

## Features

- Vehicle inquiry submission with email notifications
- Professional HTML email templates
- reCAPTCHA protection against spam
- Rate limiting to prevent abuse
- Comprehensive error handling and logging
- Production-ready configuration for Vercel deployment

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd server
   npm install
   ```

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_TO=recipient-email@example.com

# reCAPTCHA Configuration
RECAPTCHA_SECRET=your-recaptcha-secret-key
RECAPTCHA_SCORE_THRESHOLD=0.5

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX=10
```

### Running Locally

```
npm run dev
```

## Deployment to Vercel

### Setting Up Vercel

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy to Vercel:
   ```
   vercel
   ```

### Environment Variables on Vercel

Add the following environment variables in the Vercel dashboard:

- `EMAIL_USER`: Your Gmail address
- `EMAIL_PASS`: Your Gmail App Password
- `EMAIL_TO`: Recipient email address
- `RECAPTCHA_SECRET`: Your reCAPTCHA secret key
- `NODE_ENV`: Set to "production"
- `CORS_ORIGIN`: Your frontend domain (e.g., https://presidential-chauffeurs.vercel.app)

## API Endpoints

### GET /health

Returns the health status of the API.

**Response:**

```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2025-03-09T23:50:32.433Z",
  "emailEnabled": true
}
```

### GET /api/vehicles

Returns a list of all available vehicles.

**Response:**

```json
[
  {
    "id": 1,
    "name": "Rolls-Royce Phantom",
    "description": "The epitome of luxury and refinement, perfect for executive travel.",
    "rate": 1500
  },
  ...
]
```

### POST /api/inquiry

Submits a new inquiry.

**Request Body:**

```json
{
  "vehicleId": 1,
  "vehicleName": "Rolls-Royce Phantom",
  "purpose": "Executive Airport Transfer",
  "date": "2024-06-15",
  "description": "Need pickup from JFK Airport",
  "email": "customer@example.com",
  "captchaToken": "recaptcha-token"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Inquiry received successfully",
  "emailSent": true,
  "data": {
    "vehicle": "Rolls-Royce Phantom",
    "inquiryDate": "2025-03-09T23:51:51.473Z"
  }
}
```

## Security Notes

- Gmail requires an App Password for sending emails. Regular passwords won't work.
- To create an App Password:
  1. Enable 2-Step Verification in your Google Account
  2. Go to Security → App passwords
  3. Select "Mail" and "Other" (name it "Presidential Chauffeurs")
  4. Copy the generated password to your .env file

## License

This project is proprietary and confidential.
