.PHONY: install install-backend install-frontend dev dev-backend dev-frontend test clean

install: install-backend install-frontend

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

dev:
	@echo "Starting backend on :8000 and frontend on :5173"
	@(cd backend && PYTHONPATH=. uvicorn main:app --reload --port 8000) &
	@cd frontend && npm run dev

dev-backend:
	cd backend && PYTHONPATH=. uvicorn main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && PYTHONPATH=. pytest tests/ -v

clean:
	rm -rf backend/data/chroma_db backend/data/uploads backend/data/dm_tool.sqlite
	@echo "Cleaned local data. Uploaded files and vector index removed."
