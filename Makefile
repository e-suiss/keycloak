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
