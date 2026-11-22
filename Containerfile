# https://www.keycloak.org/server/containers: build once, start optimized
FROM quay.io/keycloak/keycloak:26.7.3 AS builder

ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_FEATURES=organization,dpop

WORKDIR /opt/keycloak
COPY --chown=keycloak:keycloak --chmod=644 providers/*.jar /opt/keycloak/providers/
# containers guide, known issue: a changed provider jar must not break `start --optimized`
RUN touch -m --date=@1743465600 /opt/keycloak/providers/*
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.7.3
COPY --from=builder /opt/keycloak/ /opt/keycloak/
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
