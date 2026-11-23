// @ts-nocheck
import { Button } from "@ui/components/button";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { Group, ListSkeleton, Notice } from "../../ui/kit";
import { useT } from "../../ui/i18n";
import { SelectField, SwitchRow } from "../idp/shared";

export const ORG_DOMAIN = "kc.org.domain";
export const ORG_REDIRECT = "kc.org.broker.redirect.mode.email-matches";
export const ORG_HIDE_UNKNOWN = "kc.org.broker.login.hide-when-org-unknown";

export function LinkIdpModal({ org, domains, linked, identityProvider, onClose, onSaved }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const editing = !!identityProvider;
    const [all, setAll] = useState<any[]>([]);
    const [status, setStatus] = useState<"loading" | "error" | "ready">(editing ? "ready" : "loading");
    const [attempt, setAttempt] = useState(0);
    const [alias, setAlias] = useState(identityProvider?.alias || "");
    const cfg = identityProvider?.config || {};
    const [domain, setDomain] = useState(cfg[ORG_DOMAIN] || "");
    const [hideOnLogin, setHideOnLogin] = useState(editing ? !!identityProvider.hideOnLogin : true);
    const [hideUnknown, setHideUnknown] = useState(String(cfg[ORG_HIDE_UNKNOWN]) === "true");
    const [redirect, setRedirect] = useState(String(cfg[ORG_REDIRECT]) === "true");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editing) return;
        let alive = true;
        setStatus("loading");
        adminClient.identityProviders
            .find({ realmOnly: true, max: 500 })
            .then(list => {
                if (!alive) return;
                setAll(
                    Array.isArray(list) ? list.filter((i: any) => !linked.has(i.alias) && !i.organizationId) : []
                );
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, attempt, editing]);

    const save = async () => {
        if (!alias) return;
        setSaving(true);
        try {
            const found = await adminClient.identityProviders.findOne({ alias });
            if (!found) throw new Error(t("sxIdpDetailNotFound"));
            const config = { ...(found.config || {}) };
            if (domain) config[ORG_DOMAIN] = domain;
            else delete config[ORG_DOMAIN];
            config[ORG_HIDE_UNKNOWN] = hideUnknown ? "true" : "false";
            config[ORG_REDIRECT] = redirect ? "true" : "false";
            await adminClient.identityProviders.update({ alias }, { ...found, config, hideOnLogin });
            if (!editing) await adminClient.organizations.linkIdp({ orgId: org.id, alias });
            addAlert(editing ? t("sxOrgDetailIdpLinkUpdated") : t("sxOrgDetailIdpLinked"), AlertVariant.success);
            onSaved();
        } catch (e) {
            addError(editing ? t("sxCommonUpdateError") : t("sxOrgDetailIdpLinkError"), e);
            setSaving(false);
        }
    };

    const domainOptions = [
        { value: "", label: t("sxOrgDetailDomainNone") },
        { value: "ANY", label: t("sxOrgDetailDomainAny") },
        ...domains.map((d: string) => ({ value: d, label: d }))
    ];
    if (domain && !domainOptions.some(o => o.value === domain)) domainOptions.push({ value: domain, label: domain });

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{editing ? t("sxOrgDetailEditIdpLink") : t("sxOrgDetailLinkIdp")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    {status === "loading" ? (
                        <ListSkeleton rows={2} />
                    ) : status === "error" ? (
                        <Notice
                            title={t("sxOrgDetailIdpsLoadError")}
                            description={t("sxLoadErrorDescription")}
                            onRetry={() => setAttempt(n => n + 1)}
                        />
                    ) : !editing && all.length === 0 ? (
                        <Notice title={t("sxOrgDetailNoLinkableIdps")} description={t("sxOrgDetailNoLinkableIdpsDescription")} />
                    ) : (
                        <div className="flex flex-col gap-4">
                            <SelectField
                                id="org-link-idp"
                                label={t("sxOrgDetailIdp")}
                                required
                                disabled={editing}
                                value={alias}
                                onChange={setAlias}
                                options={
                                    editing
                                        ? [{ value: alias, label: identityProvider.displayName || alias }]
                                        : [
                                              { value: "", label: t("sxOrgDetailSelectIdp") },
                                              ...all.map(i => ({
                                                  value: i.alias,
                                                  label: `${i.displayName || i.alias} (${i.providerId})`
                                              }))
                                          ]
                                }
                            />
                            <SelectField
                                id="org-link-domain"
                                label={t("sxOrgDetailDomain")}
                                hint={t("sxOrgDetailDomainHint")}
                                value={domain}
                                onChange={setDomain}
                                options={domainOptions}
                            />
                            <Group>
                                <SwitchRow
                                    label={t("sxIdpDetailHideOnLogin")}
                                    hint={t("sxIdpDetailHideOnLoginHint")}
                                    checked={hideOnLogin}
                                    onChange={setHideOnLogin}
                                />
                                <SwitchRow
                                    label={t("sxOrgDetailHideWhenOrgUnknown")}
                                    checked={hideUnknown}
                                    onChange={setHideUnknown}
                                />
                                <SwitchRow
                                    label={t("sxOrgDetailRedirectWhenEmailMatches")}
                                    hint={t("sxOrgDetailRedirectWhenEmailMatchesHint")}
                                    checked={redirect}
                                    onChange={setRedirect}
                                />
                            </Group>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button size="form" block disabled={saving || !alias || status !== "ready"} onClick={save}>
                        {saving ? t("sxCommonSaving") : editing ? t("sxCommonSave") : t("sxOrgDetailLink")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
