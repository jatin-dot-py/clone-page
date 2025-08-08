.PHONY: up down logs rebuild curl

up:
	docker compose up --build -d
	docker compose ps

rebuild:
	docker compose build --no-cache

logs:
	docker compose logs -f

down:
	docker compose down

curl:
	curl -s -X POST http://localhost:8080/clone -H 'Content-Type: application/json' -d '{"url":"https://example.com","filename":"example.html"}' | head -n 20