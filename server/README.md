# AI4ECPP Backend Server

Backend server for AI4ECPP application providing authentication and OpenAI API integration.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Create a `.env` file in the `server` directory:
```bash
cp .env.example .env
```

3. Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
JWT_SECRET=your-random-secret-key-here
PORT=3001
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create a new user account
- `POST /api/auth/login` - Login with email and password

### ChatGPT

- `POST /api/chatgpt` - Generate AI responses using OpenAI

## Environment Variables

- `PORT` - Server port (default: 3001)
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `JWT_SECRET` - Secret key for JWT tokens
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:5173)

## Notes

- Currently uses in-memory user storage. For production, use a real database.
- Make sure to keep your `.env` file secure and never commit it to version control.

