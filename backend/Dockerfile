FROM python:3.12

WORKDIR /app

# No apt-get needed - psycopg2-binary has prebuilt PostgreSQL libs
# requirements.txt uses asyncpg which is also binary

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code
COPY . .

# Uploads dir
RUN mkdir -p /app/uploads/events /app/uploads/avatars

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
