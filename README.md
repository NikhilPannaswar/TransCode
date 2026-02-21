# TransCode

A full-stack application for encoding and decoding data in multiple formats (MIDI, Prime Numbers, QR Codes) with built-in verification and pipeline automation capabilities.

## Project Structure

```
TransCode/
├── client/              # Next.js frontend application
│   ├── src/
│   │   └── app/
│   │       └── components/
│   │           ├── FileUploader.tsx      # File upload handler
│   │           ├── MidiTool.tsx          # MIDI encoding/decoding
│   │           ├── PrimeTool.tsx         # Prime number encoding/decoding
│   │           ├── QRTool.tsx            # QR code generation/decoding
│   │           ├── PipelineBuilder.tsx   # Multi-step operation pipeline
│   │           └── VerificationPanel.tsx # Data integrity verification
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
│
└── server/              # FastAPI backend application
    ├── main.py          # FastAPI endpoints and logic
    └── requirements.txt # Python dependencies
```

## Features

- **MIDI Encoding/Decoding**: Convert data to/from MIDI format
- **Prime Number Encoding/Decoding**: Encode/decode data using prime number representations
- **QR Code Generation/Decoding**: Create and scan QR codes
- **Data Verification**: Validate data integrity with hash comparison
- **Pipeline Builder**: Chain multiple operations together for complex workflows
- **File Upload**: Handle file uploads and processing

## Tech Stack

### Frontend
- **Framework**: Next.js with TypeScript
- **Styling**: CSS with Tailwind/PostCSS
- **UI Components**: Custom React components

### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Libraries**:
  - `mido` - MIDI file handling
  - `qrcode` - QR code generation
  - `pillow` - Image processing
  - `pyzbar` - Barcode/QR code decoding

## Getting Started

### Prerequisites
- Node.js 16+ (for client)
- Python 3.8+ (for server)
- npm/yarn/pnpm (for Node.js package management)

### Client Setup

```bash
cd client
npm install
npm run dev
```

The client will be available at `http://localhost:3000`

### Server Setup

```bash
cd server
pip install -r requirements.txt
python main.py
```

The server will be available at `http://localhost:8000`

## Development

### Client
The client is built with Next.js and runs on port 3000. It communicates with the backend API at `http://localhost:8000`.

```bash
cd client
npm run dev  # Development server with hot reload
npm run build  # Production build
npm run lint   # Run linter
```

### Server
The server runs on port 8000 and provides REST API endpoints.

```bash
cd server
uvicorn main:app --reload  # Development server with auto-reload
```

## API Documentation

Once the server is running, visit `http://localhost:8000/docs` for interactive Swagger API documentation.

## Usage

1. Open `http://localhost:3000` in your browser
2. Choose a tool from the available options:
   - **File Uploader**: Upload files for processing
   - **MIDI Tool**: Encode/decode MIDI files
   - **Prime Tool**: Work with prime number encoding
   - **QR Tool**: Generate and decode QR codes
   - **Verification Panel**: Verify data integrity
   - **Pipeline Builder**: Chain operations together

## Contributing

Contributions are welcome! Please ensure code follows the existing style and includes appropriate tests.

## License

[Add your license here]

## Author

[Add author information here]
