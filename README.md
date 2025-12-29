# Localizer

A command-line tool for processing and chatting with files using local LLMs via Ollama. Supports text, code, PDFs, and images.

## Features

- **Process files** - Read files, send to LLM with instructions, save output
- **Chat with files** - Interactive Q&A about file contents
- **Text-to-speech** - Read files aloud using macOS voices
- **Voice recording** - Record from microphone, transcribe with Whisper or save audio

## Requirements

- macOS (uses native file pickers and `say` command)
- [Ollama](https://ollama.ai) with at least one model installed

## Installation

1. Clone or download this repository
2. Make the script executable:
   ```bash
   chmod +x localizer
   ```
3. Install Ollama and pull a model:
   ```bash
   brew install ollama
   ollama pull llama3.2
   ```

### Optional Dependencies

| Feature | Dependency | Install |
|---------|------------|---------|
| PDF support | pdftotext | `brew install poppler` |
| Image OCR | tesseract | `brew install tesseract` |
| Native image understanding | Vision model | `ollama pull llava` |
| Voice recording | sox | `brew install sox` |
| Audio transcription | whisper | `brew install openai-whisper` |

## Usage

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
```

## License

MIT
