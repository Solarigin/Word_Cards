# Word Cards

This project contains a small FastAPI backend and tests for a vocabulary learning app.

## Configuration

- `SECRET_KEY` – signing key used for JWT tokens. If the environment variable is unset the application defaults to `"secret"`. Override it in production for better security.
- `TRANSLATE_API_KEY` – API key for the external translation service used by the `/translate` endpoint.

## Frontend

The frontend is a simple static site located in `frontend/`.
Open `frontend/index.html` in a browser or serve the directory with any HTTP server.
`index.html` now redirects to either `login.html` or `dashboard.html` depending on
whether a token exists in `localStorage`.
It uses Tailwind CSS via CDN and communicates with the FastAPI backend running on
`http://localhost:8000`.
The dashboard navigation now includes a link to `translate.html` which provides a simple translation interface.

## Running tests

Use `pytest` with the repository root on the Python path so that
`backend.app.main` imports correctly:

```bash
PYTHONPATH=. pytest
# or
python -m pytest
```
