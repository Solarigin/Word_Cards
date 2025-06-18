# Word Cards

This project contains a small FastAPI backend and tests for a vocabulary learning app.

## Configuration

- `SECRET_KEY` – signing key used for JWT tokens. If the environment variable is unset the application defaults to `"secret"`. Override it in production for better security.

## Frontend

The frontend is a simple static site located in `frontend/`.
Open `frontend/index.html` in a browser or serve the directory with any HTTP server.
`index.html` now redirects to either `login.html` or `dashboard.html` depending on
whether a token exists in `localStorage`.
It uses Tailwind CSS via CDN and communicates with the FastAPI backend running on
`http://localhost:8000`.

## Running tests

Use `pytest` with the repository root on the Python path so that
`backend.app.main` imports correctly:

```bash
PYTHONPATH=. pytest
# or
python -m pytest
```
