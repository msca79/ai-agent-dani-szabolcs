pg:
	cd devops/postgres && docker compose up -d

cli:
	npm run cli

web:
	npm run web

pdf:
	npm run convert-rulebooks -- rulebooks