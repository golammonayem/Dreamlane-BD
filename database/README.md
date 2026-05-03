# Database (MySQL)

This folder contains a local MySQL setup for Dreamlane BD.

## Start

```bash
docker compose up -d
```

## Stop

```bash
docker compose down
```

## Connection values for backend .env

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=dreamlane_bd
DB_USER=dreamlane_user
DB_PASSWORD=dreamlane_pass
```

## Notes

- Change credentials in docker-compose.yml and your backend .env for production.
- Tables are created automatically by the backend on first run.
