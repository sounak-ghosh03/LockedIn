# LockedIn Server

## Environment Variables
Copy `.env.example` to `.env` and fill in values:
```
ATLAS_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/lockedin?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
JWT_SECRET=<random-secret-32+-chars>
PORT=3000
NODE_ENV=development
SENTRY_DSN=                    # optional
```

## Running Locally
```bash
npm install
npm run dev
```

## Deploying to Render
1. Push this folder to GitHub
2. New Web Service → connect repo
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add env vars in Render dashboard
