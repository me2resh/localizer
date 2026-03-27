# Localizer

A tool for processing and chatting with files using local LLMs via Ollama. Available as both a CLI and a web interface. Supports text, code, PDFs, and images.

## Features

- **Process files** - Read files, send to LLM with instructions, save output
- **Chat with files** - Interactive Q&A about file contents
- **Text-to-speech** - Read files aloud using macOS voices
- **Voice recording** - Record from microphone, transcribe with Whisper or save audio
- **Reply assistant** - Polish and refine professional message replies
- **Web interface** - Browser-based UI with streaming responses, drag-and-drop uploads, and microphone selector

## Requirements

- macOS (uses native file pickers and `say` command)
- [Ollama](https://ollama.ai) with at least one model installed
- Node.js 18+ (for the web interface)

## Installation

1. Clone or download this repository
2. Make the CLI script executable:
   ```bash
   chmod +x localizer
   ```
3. Run the setup wizard:
   ```bash
   ./localizer setup
   ```

The setup wizard will:
- Check and install required dependencies (Ollama) via Homebrew
- Offer to install optional dependencies (sox, whisper, tesseract, poppler)
- Pull Ollama models if none are installed
- Add localizer to your PATH or create a shell alias

### Manual Installation

If you prefer manual setup, install dependencies yourself:

| Feature | Dependency | Install |
|---------|------------|---------|
| **LLM processing** | Ollama (required) | `brew install --cask ollama` |
| PDF support | pdftotext | `brew install poppler` |
| Image OCR | tesseract | `brew install tesseract` |
| Native image understanding | Vision model | `ollama pull llava` |
| Audio transcription | whisper | `brew install openai-whisper` |
| Audio conversion | ffmpeg | `brew install ffmpeg` |

Then pull at least one model:
```bash
ollama pull llama3.2
```

## Web Interface

A browser-based UI that exposes all localizer features with a modern dark-themed design, real-time streaming, and drag-and-drop file uploads.

### Quick Start

```bash
cd web
npm run install:all
npm run dev
```

This starts both the Express backend (port 3001) and the Vite frontend (port 5173). Open **http://localhost:5173** in your browser.

### Web Features

- **Process** - Upload files, pick a model, enter instructions, view streaming output
- **Chat** - Upload context files, multi-turn conversation with streaming responses
- **Reply** - Paste a message, write a draft, choose a tone, get a polished reply
- **Speak** - Paste text or upload a file, select voice and speed, trigger TTS
- **Record** - Browser-based recording with microphone selection, transcribe via Whisper
- **Setup** - View Ollama status, check dependencies, pull new models

### Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js, Express
- **LLM**: Ollama local API (localhost:11434)
- **Recording**: Browser MediaRecorder API (no sox required)
- **Transcription**: Whisper via ffmpeg + openai-whisper

## CLI Usage

```bash
./localizer <command> [path]
```

If no path is provided, a macOS file picker dialog will open.

### Commands

#### `process [path]`
Read files, process with LLM instructions, and write output to a file.

```bash
./localizer process ./src           # Process a folder
./localizer process ./document.pdf  # Process a PDF
./localizer process                 # Opens file picker
```

#### `chat [path]`
Interactively chat and ask questions about file contents.

```bash
./localizer chat ./data             # Chat about files in a folder
./localizer chat ./readme.md        # Chat about a single file
./localizer chat                    # Opens file picker
```

#### `speak [path]`
Read file contents aloud using text-to-speech.

```bash
./localizer speak ./notes.txt       # Speak a file
./localizer speak                   # Opens file picker
```

You can select from available macOS voices and adjust speech rate.

#### `record`
Record audio from microphone with options to transcribe or save.

```bash
./localizer record
```

Options:
1. **Transcribe to text** - Uses Whisper for speech-to-text
2. **Save as audio file** - Saves the recording as a .wav file

Press `Ctrl+C` to stop recording.

#### `reply`
Polish and refine professional message replies using local LLMs.

```bash
./localizer reply
```

Features:
- Paste the original message context
- Enter your draft reply or key points
- Choose from multiple tones (Professional, Friendly, Formal, Direct, Diplomatic)
- Copy polished result to clipboard
- Iterate with feedback until satisfied

#### `setup`
One-time setup wizard that configures everything needed to run localizer.

```bash
./localizer setup
```

The wizard walks you through 3 steps:
1. **Dependencies** - Checks for and installs required/optional tools via Homebrew
2. **Ollama Models** - Pulls recommended LLM models if none are installed
3. **Shell Config** - Adds localizer to your PATH or creates an alias

## Supported File Types

| Category | Extensions |
|----------|------------|
| Text | `.txt`, `.md`, `.json`, `.yaml`, `.yml`, `.xml`, `.csv` |
| Code | `.js`, `.ts`, `.py`, `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.h`, `.sh`, `.html`, `.css`, `.sql`, `.swift`, `.kt`, `.rb`, `.php` |
| PDF | `.pdf` (requires pdftotext) |
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`, `.tiff` |

## Image Processing

Images can be processed in two ways:

1. **Vision models** (llava, bakllava, moondream, etc.) - Native image understanding
2. **OCR fallback** - Text extraction via Tesseract for non-vision models

## Examples

```bash
# Process a codebase with instructions
./localizer process ./src
> "Summarize this codebase and list all API endpoints"

# Chat about a PDF document
./localizer chat ~/Documents/report.pdf
You: What are the key findings?
Assistant: ...

# Have your notes read aloud
./localizer speak ~/notes.md

# Record a voice memo and transcribe it
./localizer record

# Write a polished professional reply
./localizer reply

# Start the web interface
cd web && npm run dev
```

## License

MIT
