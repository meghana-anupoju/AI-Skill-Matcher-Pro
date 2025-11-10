FROM python:3.11-slim

WORKDIR /app

# Copy only requirements and install first for caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Ensure uploads directory exists
RUN mkdir -p uploads

EXPOSE 5000

CMD ["python", "app.py"]
