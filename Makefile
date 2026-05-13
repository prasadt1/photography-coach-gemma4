.PHONY: dev electron build ollama

## make dev       — web app with HMR at localhost:5173 (phone-accessible on LAN)
dev:
	npx vite --port 5173 --host

## make electron  — desktop app with HMR (renderer reloads on save)
electron:
	bash dev-electron.sh

## make build     — production build (web + electron main)
build:
	npm run build && npm run electron:compile

## make ollama    — start Ollama listening on all interfaces (needed for phone access)
ollama:
	OLLAMA_HOST=0.0.0.0 ollama serve
