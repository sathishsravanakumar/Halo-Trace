# Halo Trace

AI-powered LinkedIn profile finder from images. Upload a poster, flyer, or screenshot and instantly discover LinkedIn profiles using AI-powered recognition of company logos, names, and people.

## Features

- **Image Analysis**: Uses Google Gemini Vision AI to identify companies and people from images
- **Logo Recognition**: Identifies company logos and brand names automatically
- **LinkedIn Profile Finder**: Automatically searches and links to official LinkedIn company pages and profiles
- **Smart URL Matching**: Uses DuckDuckGo search to find accurate LinkedIn URLs
- **Fallback Support**: EasyOCR as backup for text extraction

## Tech Stack

**Backend (Python)**
- FastAPI - REST API
- Google Gemini Vision API - Primary image analysis
- DuckDuckGo Search - LinkedIn URL discovery
- EasyOCR - Fallback text extraction
- Python 3.10+

**Frontend (React)**
- React.js with Vite
- Modern CSS styling

## Prerequisites

- Python 3.10+
- Node.js 18+
- Google Gemini API key (required)

## Setup

### 1. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here (optional)
ANTHROPIC_API_KEY=your_anthropic_api_key_here (optional)
```

Get your Gemini API key from: [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
python main.py
```

Backend runs at `http://localhost:8000`

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Frontend runs at `http://localhost:5173`

## Usage

1. Open `http://localhost:5173` in your browser
2. Select whether you're looking for **Companies** or **People**
3. Upload an image containing logos, names, or text
4. Review the AI-identified entities
5. Click "Find LinkedIn Profiles"
6. Click on results to open direct LinkedIn profile pages

## API Endpoints

- `GET /` - Health check
- `GET /health` - API status
- `POST /api/ocr` - Extract names from image
- `POST /api/search` - Generate LinkedIn search URLs

## Project Structure

```
halo-trace/
├── backend/
│   ├── main.py             # FastAPI application
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # React component
│   │   └── App.css         # Styles
│   └── package.json
├── .env.example            # Environment template
├── .gitignore              # Git ignore rules
└── README.md
```

## License

MIT

## Acknowledgments

- Built for Hackathon 2024
- Powered by Google Gemini AI
