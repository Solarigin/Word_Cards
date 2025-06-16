# Word Cards

This project contains a small FastAPI backend and tests for a vocabulary learning app.

## Configuration

- `SECRET_KEY` – signing key used for JWT tokens. If the environment variable is unset the application defaults to `"secret"`. Override it in production for better security.

## Frontend

The frontend is located under `frontend/` and built with React, Vite and Tailwind CSS.

```bash
cd frontend
npm install
npm run dev
```

The development server listens on `http://localhost:5173` by default.

## Running tests

Use `pytest` with the repository root on the Python path so that
`backend.app.main` imports correctly:

```bash
PYTHONPATH=. pytest
# or
python -m pytest
```
