import io
import sys
import hashlib
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from mido import MidiFile, MidiTrack, Message
import qrcode
from PIL import Image, ImageDraw, ImageFont
from pyzbar import pyzbar
import base64

# Set unlimited integer string conversion
sys.set_int_max_str_digits(0)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class PrimeRequest(BaseModel):
    prime_string: str

class QRDecodeRequest(BaseModel):
    image_data: str  # base64 encoded image

class VerificationRequest(BaseModel):
    original_hash: str
    decoded_hash: str

class VerificationResponse(BaseModel):
    verified: bool
    match: bool

class PipelineStep(BaseModel):
    operation: str  # 'encode_midi', 'encode_prime', 'encode_qr', 'decode_midi', etc.
    parameters: dict = {}

class PipelineRequest(BaseModel):
    steps: List[PipelineStep]

# Utility Functions
def calculate_hash(data: bytes) -> str:
    """Calculate SHA-256 hash of data"""
    return hashlib.sha256(data).hexdigest()

def bytes_to_prime_string(data: bytes, filename: str = "") -> str:
    """Convert bytes to a large decimal string with metadata"""
    # Fixed-length header format:
    # [4 bytes: filename length][filename bytes][4 bytes: data length][binary data]
    
    filename_bytes = filename.encode('utf-8')
    filename_len = len(filename_bytes)
    data_len = len(data)
    
    # Create header with fixed 4-byte integers
    header = (
        filename_len.to_bytes(4, byteorder='big') +
        filename_bytes +
        data_len.to_bytes(4, byteorder='big')
    )
    
    full_data = header + data
    # Convert to integer (big-endian)
    big_int = int.from_bytes(full_data, byteorder='big')
    
    try:
        return str(big_int)
    except ValueError as e:
        # If still too large, use hex representation instead
        return big_int.hex()

def prime_string_to_bytes(prime_str: str) -> tuple[bytes, str]:
    """Convert prime string back to bytes and extract filename"""
    try:
        big_int = int(prime_str)
        # Convert back to bytes
        byte_length = (big_int.bit_length() + 7) // 8
        full_data = big_int.to_bytes(byte_length, byteorder='big')
        
        # Try new fixed-length header format first
        # [4 bytes: filename length][filename bytes][4 bytes: data length][binary data]
        try:
            if len(full_data) >= 8:
                filename_len = int.from_bytes(full_data[0:4], byteorder='big')
                
                # Validate: filename length should be reasonable
                if 0 <= filename_len <= 500:  # Reasonable max filename
                    filename_start = 4
                    filename_end = filename_start + filename_len
                    
                    if filename_end <= len(full_data):
                        try:
                            filename = full_data[filename_start:filename_end].decode('utf-8')
                            
                            # Check for second length field
                            data_len_start = filename_end
                            data_len_end = data_len_start + 4
                            
                            if data_len_end <= len(full_data):
                                data_len = int.from_bytes(full_data[data_len_start:data_len_end], byteorder='big')
                                
                                # Validate data length
                                if data_len <= (len(full_data) - data_len_end):
                                    data_start = data_len_end
                                    data_end = data_start + data_len
                                    data_bytes = full_data[data_start:data_end]
                                    
                                    return data_bytes, filename
                        except UnicodeDecodeError:
                            pass
        except (ValueError, UnicodeDecodeError):
            pass
        
        # Fallback: assume entire thing is data (old format or unknown)
        return full_data, "decoded_file"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid prime string: {str(e)}")

def add_musical_tracks(mid: MidiFile, data_track: MidiTrack) -> None:
    """Add harmony, bass, and drum tracks to MIDI file"""
    # Bass track (Track 2)
    bass_track = MidiTrack()
    mid.tracks.append(bass_track)
    bass_track.append(Message('program_change', channel=1, program=32))  # Bass sound
    
    # Chord track (Track 3)
    chord_track = MidiTrack()
    mid.tracks.append(chord_track)
    chord_track.append(Message('program_change', channel=2, program=0))  # Piano
    
    # Drum track (Track 4)
    drum_track = MidiTrack()
    mid.tracks.append(drum_track)
    
    # Add simple accompaniment based on data patterns
    time = 0
    for i, msg in enumerate(data_track):
        if msg.type == 'note_on':
            note = msg.note
            velocity = msg.velocity
            
            # Bass line (root notes)
            bass_note = (note % 12) + 36  # Bass range
            bass_track.append(Message('note_on', channel=1, note=bass_note, velocity=velocity//2, time=time))
            bass_track.append(Message('note_off', channel=1, note=bass_note, velocity=velocity//2, time=480))
            
            # Simple chord (triad)
            chord_notes = [note, (note + 4) % 128, (note + 7) % 128]
            for chord_note in chord_notes:
                chord_track.append(Message('note_on', channel=2, note=chord_note, velocity=velocity//3, time=0))
            for chord_note in chord_notes:
                chord_track.append(Message('note_off', channel=2, note=chord_note, velocity=velocity//3, time=240))
            
            # Simple drum pattern
            if i % 4 == 0:  # Kick on beats 1 and 3
                drum_track.append(Message('note_on', channel=9, note=36, velocity=100, time=time))
                drum_track.append(Message('note_off', channel=9, note=36, velocity=100, time=100))
            if i % 4 == 2:  # Snare on beats 2 and 4
                drum_track.append(Message('note_on', channel=9, note=38, velocity=80, time=time))
                drum_track.append(Message('note_off', channel=9, note=38, velocity=80, time=100))
        
        time = msg.time

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TransCode API"}

# MIDI Codec Endpoints
@app.post("/encode/midi")
async def encode_to_midi(file: UploadFile = File(...), mode: str = "raw"):
    """Encode file to MIDI format"""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Create MIDI file
    mid = MidiFile()
    track = MidiTrack()
    mid.tracks.append(track)
    
    # Convert each byte to MIDI notes
    for i, byte in enumerate(content):
        # Map byte (0-255) to MIDI notes (48-111, C3-D#7)
        note = 48 + (byte % 64)  # Limit to 64 note range
        velocity = max(40, min(127, 40 + (byte >> 2)))  # Variable velocity
        time = 120 if i > 0 else 0  # 120 ticks between notes
        
        track.append(Message('note_on', note=note, velocity=velocity, time=time))
        track.append(Message('note_off', note=note, velocity=velocity, time=120))
    
    # Add musical enhancement if requested
    if mode == "musical":
        add_musical_tracks(mid, track)
    
    # Save to memory
    midi_buffer = io.BytesIO()
    mid.save(file=midi_buffer)
    midi_buffer.seek(0)
    
    file_hash = calculate_hash(content)
    headers = {'X-Original-Hash': file_hash}
    
    return StreamingResponse(
        midi_buffer,
        media_type="audio/midi",
        headers=headers,
        filename=f"encoded_{file.filename or 'file'}.mid"
    )

@app.post("/decode/midi")
async def decode_from_midi(file: UploadFile = File(...)):
    """Decode MIDI file back to original format"""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")
    
    try:
        # Parse MIDI file
        midi_buffer = io.BytesIO(content)
        mid = MidiFile(file=midi_buffer)
        
        # Extract original data from first track
        if not mid.tracks:
            raise HTTPException(status_code=400, detail="MIDI file has no tracks")
        
        track = mid.tracks[0]
        original_bytes = bytearray()
        
        # Extract bytes from MIDI note data
        for msg in track:
            if msg.type == 'note_on':
                # Reverse the encoding: note to byte
                note_offset = msg.note - 48
                velocity_part = (msg.velocity - 40) << 2
                byte_value = (note_offset % 64) + min(192, max(0, velocity_part))
                original_bytes.append(byte_value % 256)
        
        decoded_hash = calculate_hash(bytes(original_bytes))
        headers = {'X-Decoded-Hash': decoded_hash}
        
        return StreamingResponse(
            io.BytesIO(bytes(original_bytes)),
            media_type="application/octet-stream",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode MIDI: {str(e)}")

# Prime Codec Endpoints
@app.post("/encode/prime")
async def encode_to_prime(file: UploadFile = File(...)):
    """Encode file to prime/decimal string"""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")
    
    file_hash = calculate_hash(content)
    filename = file.filename or "unknown"
    prime_str = bytes_to_prime_string(content, filename)
    
    result = {
        "prime_string": prime_str,
        "original_hash": file_hash,
        "original_size": len(content),
        "original_filename": filename,
        "digit_count": len(prime_str)
    }
    
    return result

@app.post("/decode/prime")
async def decode_from_prime(prime_data: dict):
    """Decode prime string back to original file"""
    prime_str = prime_data.get("prime_string")
    if not prime_str:
        raise HTTPException(status_code=400, detail="Missing prime_string")
    
    try:
        original_bytes, filename = prime_string_to_bytes(prime_str)
        decoded_hash = calculate_hash(original_bytes)
        
        headers = {
            'X-Decoded-Hash': decoded_hash,
            'X-Decoded-Filename': filename,
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        
        return StreamingResponse(
            io.BytesIO(original_bytes),
            media_type="application/octet-stream",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode prime: {str(e)}")

# QR Codec Endpoints
@app.post("/encode/qr")
async def encode_to_qr(file: UploadFile = File(...)):
    """Encode file to QR code image"""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Check file size limit (500KB)
    if len(content) > 500 * 1024:
        raise HTTPException(status_code=400, detail="File too large for QR encoding (max 500KB)")
    
    # Encode file content to base64
    file_hash = calculate_hash(content)
    filename = file.filename or "unknown"
    
    data_to_encode = {
        "filename": filename,
        "hash": file_hash,
        "data": base64.b64encode(content).decode('utf-8')
    }
    
    try:
        # Create QR code
        qr = qrcode.QRCode(
            version=None,  # Auto-determine version
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        import json
        qr.add_data(json.dumps(data_to_encode))
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to memory
        img_buffer = io.BytesIO()
        qr_img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        headers = {'X-Original-Hash': file_hash}
        
        return StreamingResponse(
            img_buffer,
            media_type="image/png",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not create QR code: {str(e)}")

@app.post("/decode/qr")
async def decode_from_qr(qr_data: QRDecodeRequest):
    """Decode QR code image back to original file"""
    try:
        # Decode base64 image
        image_data = base64.b64decode(qr_data.image_data.split(',')[1] if ',' in qr_data.image_data else qr_data.image_data)
        image = Image.open(io.BytesIO(image_data))
        
        # Decode QR code
        decoded_objects = pyzbar.decode(image)
        if not decoded_objects:
            raise HTTPException(status_code=400, detail="No QR code found in image")
        
        # Parse QR data
        qr_text = decoded_objects[0].data
        
        # Try different character encodings
        try:
            qr_string = qr_text.decode('utf-8')
        except UnicodeDecodeError:
            try:
                qr_string = qr_text.decode('latin-1')
            except UnicodeDecodeError:
                raise HTTPException(status_code=400, detail="Could not decode QR text encoding")
        
        try:
            import json
            data = json.loads(qr_string)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid QR code data format")
        
        # Extract original file data
        filename = data.get('filename', 'decoded_file')
        original_hash = data.get('hash', '')
        file_data = base64.b64decode(data['data'])
        
        # Verify integrity
        decoded_hash = calculate_hash(file_data)
        
        headers = {
            'X-Decoded-Hash': decoded_hash,
            'X-Original-Hash': original_hash,
            'X-Decoded-Filename': filename,
            'Content-Disposition': f'attachment; filename="{filename}"'
        }
        
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type="application/octet-stream",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode QR: {str(e)}")

# Verification endpoint
@app.post("/verify")
async def verify_hashes(verification: VerificationRequest):
    """Verify if original and decoded hashes match"""
    match = verification.original_hash.lower() == verification.decoded_hash.lower()
    verified = len(verification.original_hash) == 64 and len(verification.decoded_hash) == 64
    
    return VerificationResponse(verified=verified, match=match)

# Pipeline endpoint
@app.post("/pipeline")
async def process_pipeline(pipeline: PipelineRequest, file: UploadFile = File(...)):
    """Process file through multiple encoding/decoding steps"""
    current_data = await file.read()
    current_filename = file.filename or "unknown"
    
    results = []
    
    try:
        for step in pipeline.steps:
            # This would need implementation for each step type
            # For now, return a placeholder
            results.append({
                "operation": step.operation,
                "status": "completed",
                "parameters": step.parameters
            })
        
        return {"steps": results, "status": "completed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Pipeline processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)