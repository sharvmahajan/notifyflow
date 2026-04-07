.PHONY: dev migrate seed logs down

dev:
	docker compose up --build

migrate:
	cd backend && npx prisma migrate dev

seed:
	cd backend && npx ts-node prisma/seed.ts

logs:
	docker compose logs -f

down:
	docker compose down
