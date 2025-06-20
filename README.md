# Word Cards

This project contains a small FastAPI backend and tests for a vocabulary learning app.

## Configuration

- `SECRET_KEY` – signing key used for JWT tokens. If the environment variable is unset the application defaults to `"secret"`. Override it in production for better security.
- `TRANSLATE_API_KEY` – API key for the external translation service used by the `/translate` and `/generate_article` endpoints. These features will return an error if the key is not provided.

Create a `.env` file in the project root to provide these variables during development. A template is available as `.env.example`. The file should define `SECRET_KEY` and `TRANSLATE_API_KEY`:

```bash
cp .env.example .env
# then edit .env and set the values
```

## Frontend

The frontend is a simple static site located in `frontend/`.
Open `frontend/index.html` in a browser or serve the directory with any HTTP server.
`index.html` now redirects to either `login.html` or `dashboard.html` depending on
whether a token exists in `localStorage`.
It uses Tailwind CSS via CDN and communicates with the FastAPI backend running on
`http://localhost:8000`.
The dashboard now includes a Translate button which switches the main view to a
built-in translator. This view uses the same Tailwind styling and does not leave
the dashboard page.

Word books are stored as JSON files under the `wordbooks/` directory using the naming
scheme `wordBook_<NAME>.json`.

## Running tests

Use `pytest` with the repository root on the Python path so that
`backend.app.main` imports correctly:

```bash
PYTHONPATH=. pytest
# or
python -m pytest
```
