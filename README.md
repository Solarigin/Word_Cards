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
