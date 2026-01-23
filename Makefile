.PHONY: dev-prod install-deps setup-env clean-env

# Default production API URL (can be overridden)
PROD_API_URL ?= https://pickleball-leagues.vercel.app
ENV_FILE = pickleball-react/.env.local

# Supabase configuration (optional - can be overridden)
SUPABASE_URL ?=
SUPABASE_ANON_KEY ?=

dev-prod: setup-env install-deps
	@echo "Starting development server with production API..."
	cd pickleball-react && npm run dev

setup-env:
	@echo "Setting up environment file..."
	@touch $(ENV_FILE)
	@if [ -z "$$(grep VITE_API_BASE_URL $(ENV_FILE) 2>/dev/null)" ]; then \
		echo "VITE_API_BASE_URL=$(PROD_API_URL)" >> $(ENV_FILE); \
		echo "Added VITE_API_BASE_URL to $(ENV_FILE)"; \
	else \
		echo "VITE_API_BASE_URL already configured in $(ENV_FILE)"; \
	fi
	@if [ -n "$(SUPABASE_URL)" ] && [ -z "$$(grep VITE_SUPABASE_URL $(ENV_FILE) 2>/dev/null)" ]; then \
		echo "VITE_SUPABASE_URL=$(SUPABASE_URL)" >> $(ENV_FILE); \
		echo "Added VITE_SUPABASE_URL to $(ENV_FILE)"; \
	fi
	@if [ -n "$(SUPABASE_ANON_KEY)" ] && [ -z "$$(grep VITE_SUPABASE_ANON_KEY $(ENV_FILE) 2>/dev/null)" ]; then \
		echo "VITE_SUPABASE_ANON_KEY=$(SUPABASE_ANON_KEY)" >> $(ENV_FILE); \
		echo "Added VITE_SUPABASE_ANON_KEY to $(ENV_FILE)"; \
	fi
	@if [ -z "$$(grep VITE_SUPABASE_URL $(ENV_FILE) 2>/dev/null)" ]; then \
		echo ""; \
		echo "⚠️  Warning: Supabase configuration missing!"; \
		echo "   Add your Supabase credentials to $(ENV_FILE):"; \
		echo "   VITE_SUPABASE_URL=https://your-project-id.supabase.co"; \
		echo "   VITE_SUPABASE_ANON_KEY=your-anon-key-here"; \
		echo ""; \
	fi

install-deps:
	@echo "Installing dependencies..."
	cd pickleball-react && npm install

clean-env:
	@echo "Removing environment file..."
	rm -f $(ENV_FILE)
