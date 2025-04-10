# Aikira Terminal

A sophisticated digital governance interface featuring pastel aesthetics with pink, purple, and turquoise against a digital world backdrop. This interface serves as the interactive portal to Aikira's Constitutional AI Core.

## Overview

Aikira Terminal is a modern web-based interface that simulates a Constitutional AI governance system. It features elegant digital typography, a pastel color scheme, neural network visualizations, and interactive voice input/output capabilities.

The terminal creates an immersive experience with visual effects like flowing data streams, particle animations, and a hexagonal central display that serves as the primary interaction point with the AI core.

## Features

- **Constitutional AI Core Visualization**: Hexagonal central display showing the AI's core principles and response area
- **Voice Interface**: Integration with OpenAI Whisper for voice recognition and Eleven Labs for AI-generated speech
- **Governance Metrics**: Real-time monitoring of constitutional alignment, proposal evaluation, and consensus index
- **Digital World Background**: Beautiful animations with neural network patterns, data flows, and particle effects
- **Terminal Mode**: Alternative command-line style interface for direct interaction with the system
- **Voice Testing Tool**: Dedicated page for testing voice input/output capabilities

## Technical Details

### Frontend

- HTML5, CSS3, and JavaScript
- Canvas-based visualizations and WebGL shaders
- Libraries: Three.js, P5.js, GSAP

### Backend

- Node.js server
- API integration with Eleven Labs for voice generation
- API integration with OpenAI Whisper for speech recognition

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/aikira-terminal.git
   cd aikira-terminal
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and add your API keys:
   ```
   ELEVEN_LABS_API_KEY=your_eleven_labs_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the server:
   ```
   npm start
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Project Structure

```
aikira-terminal/
├── frontend/               # Frontend files
│   ├── assets/             # Static assets
│   │   ├── audio/          # Sound effects
│   │   ├── fonts/          # Custom fonts
│   │   ├── images/         # Images
│   │   └── shaders/        # GLSL shaders
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript files
│   ├── lib/                # Third-party libraries
│   ├── index.html          # Main interface
│   ├── terminal.html       # Terminal interface
│   └── test-voice.html     # Voice testing interface
├── backend/                # Backend files
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── services/           # External API integrations
│   └── utils/              # Utility functions
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore file
├── package.json            # Node.js dependencies
├── server.js               # Main server file
└── README.md               # This file
```

## Core Principles

Aikira's Constitutional AI is built on three foundational principles:

1. **Primary Directive**: "Maximize value with fairness and protection"
2. **Governance Approach**: "Deliberative analysis of community proposals"
3. **Execution Protocol**: "Automated on-chain implementation"

## Voice Capabilities

The system integrates with:

- **Eleven Labs**: For realistic AI-generated speech responses
- **OpenAI Whisper**: For accurate transcription of voice input

## Development

This project uses modern web standards and is designed to be extended with additional features. The codebase is structured to allow for easy modification and expansion.

### Adding Features

1. Frontend changes can be made in the appropriate CSS/JS files
2. Backend API integrations can be added in the services directory
3. New visualizations can be created in the digital-effects.js file

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- Design concept and implementation by Canned Oxygen
- Inspired by constitutional AI principles
- Built with modern web technologies