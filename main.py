import os
import threading
import time
from pathlib import Path

import psutil
from dotenv import load_dotenv
from fastapi import FastAPI, Security, HTTPException, Depends, File, UploadFile, Request
from fastapi.responses import StreamingResponse
from fastapi.security import APIKeyHeader
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

DATABASE_URL = "sqlite:///./database.db"
Base = declarative_base()
API_KEY = os.getenv("API_KEY")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
process = psutil.Process(os.getpid())


class PDFFile(Base):
    __tablename__ = "pdf_files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI(docs_url='/api/docs', redoc_url='/api/redoc', openapi_url='/api/openapi.json')
origins = [
    'http://localhost:5173',
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return api_key


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.post("/upload-pdf/", tags=["upload"])
async def upload_pdf(file: UploadFile = File(...), user: str = Depends(get_current_user), db=Depends(get_db)):
    if not file:
        raise HTTPException(status_code=400, detail="File not found")
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be PDF")
    directory = "pdf_files"
    Path(directory).mkdir(exist_ok=True)
    file_location = f"{directory}/{file.filename}"

    with open(file_location, "wb+") as file_object:
        file_object.write(file.file.read())

    db_pdf_file = PDFFile(filename=file.filename)
    db.add(db_pdf_file)
    db.commit()
    db.refresh(db_pdf_file)
    return {"filename": file.filename}


@app.delete("/delete-pdf/{id}", tags=["delete"])
async def delete_pdf(id: int, user: str = Depends(get_current_user), db=Depends(get_db)):
    db_pdf_file = db.query(PDFFile).filter(PDFFile.id == id).first()
    if not db_pdf_file:
        raise HTTPException(status_code=404, detail="File not found")
    db.delete(db_pdf_file)
    db.commit()
    return {"message": "File deleted successfully"}


@app.get("/list-pdf/", tags=["list"])
async def list_pdf(user: str = Depends(get_current_user), db=Depends(get_db)):
    db_pdf_files = db.query(PDFFile).all()
    return db_pdf_files


@app.get("/stream-pdf/{id}", tags=["stream"])
async def stream_pdf(id: int, request: Request, db=Depends(get_db)):
    db_pdf_file = db.query(PDFFile).filter(PDFFile.id == id).first()
    if not db_pdf_file:
        raise HTTPException(status_code=404, detail="File not found")
    pdf_path = Path(f"pdf_files/{db_pdf_file.filename}")
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_size = pdf_path.stat().st_size
    start, end = 0, file_size - 1  # default values
    range_header = request.headers.get('Range')
    if range_header:
        start_str, end_str = range_header.replace('bytes=', '').split('-')
        start, end = int(start_str), int(end_str)

    def file_reader(start, end):
        with open(pdf_path, 'rb') as f:
            f.seek(start)
            while True:
                bytes_to_read = min(1024 * 1024, end - f.tell() + 1)  # read in 1MB chunks
                chunk = f.read(bytes_to_read)
                if not chunk:
                    break
                yield chunk
                start += bytes_to_read

    headers = {
        'Content-Range': f'bytes {start}-{end}/{file_size}',
        'Accept-Ranges': 'bytes',
        'Content-Length': str(end - start + 1),
        'Content-Type': 'application/pdf',
    }

    return StreamingResponse(file_reader(start, end), status_code=206, headers=headers)


@app.get('/memory-usage', tags=["memory"])
def read_memory_usage():
    memory_info = process.memory_info()
    return {"Memory Usage": f"{memory_info.rss / (1024 * 1024):.2f} MB"}


def log_memory_usage():
    while True:
        memory_info = process.memory_info()
        print(f"Memory Usage: {memory_info.rss / (1024 * 1024):.2f} MB")
        time.sleep(10)  # Log every 10 seconds

# Start the logging thread
# logging_thread = threading.Thread(target=log_memory_usage)
# logging_thread.start()
