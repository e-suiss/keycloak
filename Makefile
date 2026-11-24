SHELL := /bin/bash
.DEFAULT_GOAL := help

JAVA_HOME ?= /opt/homebrew/opt/openjdk@21
MVN ?= JAVA_HOME=$(JAVA_HOME) mvn
KC_EXT_DIR := extensions
KC_PROVIDERS := providers

.PHONY: help
help: ## Komutlar
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-16s %s\n", $$1, $$2}'

.PHONY: keycloak-ext
keycloak-ext: ## SPI jar'larını derle ve providers/ altına koy
	$(MVN) -q -B -f $(KC_EXT_DIR)/pom.xml clean package
	rm -f $(KC_PROVIDERS)/keycloak-*.jar
	cp $(KC_EXT_DIR)/*/target/*.jar $(KC_PROVIDERS)/
	@ls -1 $(KC_PROVIDERS)/*.jar

.PHONY: keycloak-theme
keycloak-theme: ## Keycloakify temasını derle ve providers/ altına koy
	pnpm run build-keycloak-theme
	cp dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar $(KC_PROVIDERS)/suiss-theme.jar
	@ls -1 $(KC_PROVIDERS)/*.jar

.PHONY: keycloak-test
keycloak-test: ## SPI testleri
	$(MVN) -B -f $(KC_EXT_DIR)/pom.xml test

.PHONY: env
env: ## .env yoksa rastgele şifrelerle oluştur
	@test -f .env || sed -e "s/^KC_BOOTSTRAP_ADMIN_PASSWORD=.*/KC_BOOTSTRAP_ADMIN_PASSWORD=$$(openssl rand -hex 16)/" -e "s/^KC_DB_PASSWORD=.*/KC_DB_PASSWORD=$$(openssl rand -hex 16)/" .env.example > .env

.PHONY: certs
certs: ## yerel CA ve TLS sertifikaları (deploy/tls)
	./deploy/certs.sh

.PHONY: image
image: keycloak-ext keycloak-theme ## SPI + tema ile optimize Keycloak imajı
	docker compose build keycloak

.PHONY: import
import: env ## realm'i bir kez içe aktar (var olan realm'e dokunmaz)
	docker compose --profile import run --rm realm-import

.PHONY: up
up: env certs ## proxy + Keycloak + PostgreSQL
	docker compose up -d
	@./deploy/master-frontend.sh

.PHONY: down
down: ## durdur (veri kalır)
	docker compose down

.PHONY: logs
logs: ## Keycloak logları
	docker compose logs -f keycloak

DEV_CONTAINER := esuiss-kc-dev
DEV_JAR := dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar

.PHONY: dev
dev: ## dev ortamı: Keycloak + hot reload (admin/account anında, login kaydedince derlenir)
	@docker ps --format '{{.Names}}' | grep -qx $(DEV_CONTAINER) || $(MAKE) -s dev-up
	node scripts/dev-watch.mjs

.PHONY: dev-theme
dev-theme: ## temayı tsc olmadan derle ve .dev/theme altına aç
	npx vite build --logLevel error
	npx keycloakify build > /dev/null
	rm -rf .dev/unpack && mkdir -p .dev/unpack .dev/theme
	unzip -q -o $(DEV_JAR) 'theme/*' -d .dev/unpack
	rsync -a --delete .dev/unpack/theme/ .dev/theme/

.PHONY: dev-up
dev-up: ## dev Keycloak'ı (yeniden) başlat — http://localhost:8080
	@test -d .dev/theme/suiss || $(MAKE) -s dev-theme
	-@docker rm -f $(DEV_CONTAINER) > /dev/null 2>&1
	docker run -d --name $(DEV_CONTAINER) -p 127.0.0.1:8080:8080 \
		-e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin -e ESUISS_ENV=dev \
		-e KEYCLOAKIFY_SPA_DEV_SERVER_PORT=5173 \
		-v $(CURDIR)/realms:/opt/keycloak/data/import:ro \
		-v $(CURDIR)/.dev/theme:/opt/keycloak/themes:ro \
		$(foreach j,$(wildcard $(KC_PROVIDERS)/keycloak-*.jar),-v $(CURDIR)/$(j):/opt/keycloak/providers/$(notdir $(j)):ro) \
		quay.io/keycloak/keycloak:26.7.3 start-dev --import-realm --features=organization,dpop,oid4vc-vci
	@until curl -sf -o /dev/null http://localhost:8080/realms/master; do sleep 2; done
	@docker exec $(DEV_CONTAINER) /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user admin --password admin > /dev/null
	@docker exec $(DEV_CONTAINER) /opt/keycloak/bin/kcadm.sh update realms/master -s adminTheme=suiss -s accountTheme=suiss -s loginTheme=suiss
	@node scripts/dev-clients.mjs

.PHONY: dev-logs
dev-logs: ## dev Keycloak logları (SMS kodları dahil)
	docker logs -f $(DEV_CONTAINER)

.PHONY: dev-down
dev-down: ## dev Keycloak'ı durdur
	-docker rm -f $(DEV_CONTAINER)
