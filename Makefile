
#Start postgres
pg:
	cd devops/postgres && docker compose up -d

# Drop database
pgfull:
	cd devops/postgres && docker compose down -v && docker compose up -d

# Build RAG
rag:
	npm run load-knowledge


cli:
	npm run cli

web:
	npm run web

#Convert PDF to TXT in folder: rulebooks
pdf:
	npm run convert-rulebooks -- rulebooks