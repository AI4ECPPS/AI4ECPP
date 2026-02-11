# AI4ECPP - AI Tools for Economics & Public Policy

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A web application designed to help students and researchers use AI more conveniently in economics and public policy research.

## Features

The app offers **Student Mode** and **Professional Mode** with different tool sets.

### Core Tools
- **Empirical Copilot** - Generate R/Python/Stata code from text or formula screenshots
- **Policy Memo Generator** - Structured policy memos with key points and recommendations
- **Paper Deconstructor** - Extract strategies, assumptions, and summaries from papers
- **Interview Trainer** - Practice Predoc technical interviews with AI questions
- **Cover Letter Editor** - AI-powered revision suggestions for cover letters
- **Offer Generator** - Humorous fake offer letters for academic and industry positions
- **Proof Writer** - Upload formula images and generate mathematical proofs or explanations
- **Formula to LaTeX** - Convert formulas to LaTeX from images or text descriptions
- **Code Snippet Library** - R/Stata code snippets for regression, DiD, RDD, and more

### Research Support
- **Policy Analyst** - AI-assisted policy analysis with empirical tools
- **Policy DL Agent** - Deep learning models for policy optimization
- **Literature Helper** - Literature review and citation assistance
- **Research Design Advisor** - Research methodology guidance

### Student Resources
- **Topics** - Curated resources by field (Urban, Healthcare, Development, etc.)
- **Knowledge Base** - Essential concepts in economics, econometrics, and data analysis
- **Career Path** - Guidance for economics and policy careers
- **Find Professors** - Search economics professors by field and school
- **Book List** - Recommended books in economics and public policy
- **Outside Links** - Useful resources for economics and policy research
- **Paper Replication** - Data and code for replicating AER and AEA journal papers

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- [OpenAI API key](https://platform.openai.com/api-keys)
- Python 3 (optional, for Policy Analyst & Policy DL Agent features)

### Installation

```bash
# Clone the repository
git clone https://github.com/AI4ECPPS/AI4ECPP.git
cd AI4ECPP

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Copy environment template
cp server/.env.example server/.env
```

### Configuration

Edit `server/.env` and add your credentials:

```
PORT=3001
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET=your-random-secret-key
FRONTEND_URL=http://localhost:1307
```

Generate a secure JWT secret: `openssl rand -base64 32`

### Run Locally

**Option A - One command (recommended):**
```bash
./start.sh
```

**Option B - Two terminals:**

Terminal 1 - Backend:
```bash
cd server && npm start
```

Terminal 2 - Frontend:
```bash
npm run dev
```

Visit `http://localhost:1307`

## Deployment

The project includes Docker and Railway configuration for easy deployment. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

```bash
# Build with Docker
docker build -t ai4ecpp .

# Run
docker run -p 3001:3001 -e OPENAI_API_KEY=xxx -e JWT_SECRET=xxx ai4ecpp
```

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express.js |
| AI | OpenAI API |
| ML/Analysis | Python (PyTorch, pandas, scikit-learn) |

## Project Structure

```
AI4ECPP/
├── src/                 # Frontend React app
│   ├── pages/          # Page components
│   ├── components/     # Reusable components
│   └── utils/          # API & utilities
├── server/             # Backend Express server
│   ├── routes/         # API routes
│   └── scripts/        # Python analysis scripts
├── Dockerfile          # Production build
└── railway.toml        # Railway config
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `JWT_SECRET` | Yes | Secret for JWT tokens |
| `PORT` | No | Server port (default: 3001) |
| `FRONTEND_URL` | No | CORS origin for frontend |
| `VITE_API_BASE_URL` | No | Backend API URL (frontend) |
| `DATABASE_URL` | No | PostgreSQL connection string for user data and RAG persistence |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
