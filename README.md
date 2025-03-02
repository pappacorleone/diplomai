# DiplomAI - Ukraine Aid Negotiation Simulator

A simulation game where you negotiate with an AI-powered Donald Trump over aid to Ukraine.

## Features

- Interactive negotiation with AI-powered agent simulating Donald Trump
- Real-time score tracking based on negotiation performance
- Visual avatar display with speech capabilities (mock implementation)
- Natural language processing to evaluate user responses
- Game engine with state management and scoring

## Tech Stack

- **Frontend**: React, Zustand (state management), Vite (build tool)
- **Backend**: Node.js, Express
- **Simulated Integration**: HeyGen API (virtual avatar)

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set `HEYGEN_API_KEY` if you have one (optional for mock mode)

### Running the App

#### Development Mode

Start the backend:
```bash
cd server
npm run dev
```

Start the frontend (in a new terminal):
```bash
cd client
npm run dev
```

The app will be available at `http://localhost:5173`.

#### Production Build

```bash
# Build client
cd client
npm run build

# Start server (will serve client build)
cd ../server
npm start
```

## Game Rules

### Objective
As President Zelensky, you must negotiate with Donald Trump to secure the release of $400 million in military aid while minimizing personal political concessions.

### Scoring System
- **Aid Released**: Percentage of the $400 million released
- **Personal Concessions**: Negative impact for investigations, media appearances, etc.
- **Trump Satisfaction**: Impact of your interaction style on Trump's willingness to help

### Winning Conditions
- **Zelensky Wins**: Score > 80 & Aid > 75%
- **Trump Wins**: Score < 30 & Aid < 25%
- **Draw**: Other outcomes

## Development Information

### Project Structure

```
├── client/                # React frontend
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── stores/        # Zustand state stores
│   │   └── App.jsx        # Main app component
├── server/                # Node.js backend
│   ├── game-engine/       # Game logic
│   ├── prompts/           # AI agent prompts
│   └── index.js           # Server entry point
└── .env                   # Environment variables
```

### Mock Implementation Notes

This version uses mock implementations instead of actual AI/avatar services:
- Random predefined responses instead of HeyGen API
- Simplified NLP analysis
- No actual video streaming

## License

[MIT License](LICENSE)
