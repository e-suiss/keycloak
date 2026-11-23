// @ts-nocheck

import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import { AdminPage, Chip, Group, ListSkeleton, Notice, Pager, Row, SearchField, Section } from "../ui/kit";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";

const PAGE = 20;
const lines = (s: string) =>
    s
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);

const aliasFromName = (name: string) =>
    name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-");

export default function Organizations() {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();

    const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
    const [orgs, setOrgs] = useState<any[]>([]);
    const [first, setFirst] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [query, setQuery] = useState("");
    const [attempt, setAttempt] = useState(0);
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => {
            setFirst(0);
            setQuery(searchInput.trim());
        }, 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    useEffect(() => {
        let alive = true;
        setStatus("loading");
        const params: any = { first, max: PAGE + 1 };
        if (query) params.search = query;
        adminClient.organizations
            .find(params)
            .then(result => {
                if (!alive) return;
                const list = Array.isArray(result) ? result : [];
                setHasMore(list.length > PAGE);
                setOrgs(list.slice(0, PAGE));
                setStatus("ready");
            })
            .catch(() => alive && setStatus("error"));
        return () => {
            alive = false;
        };
    }, [adminClient, query, first, attempt]);

    const newButton = <Button onClick={() => setCreateOpen(true)}>{t("sxOrgsNew")}</Button>;

    return (
        <AdminPage
            title={t("sxOrgsTitle")}
            description={t("sxOrgsDescription")}
            actions={newButton}
        >
            <SearchField value={searchInput} onChange={setSearchInput} placeholder={t("sxOrgsSearchPlaceholder")} />

            <Section label={t("sxOrgsTitle")}>
                {status === "loading" && <ListSkeleton />}
                {status === "error" && (
                    <Notice
                        title={t("sxOrgsLoadError")}
                        description={t("sxLoadErrorDescription")}
                        onRetry={() => setAttempt(n => n + 1)}
                    />
                )}
                {status === "ready" && orgs.length === 0 && (
                    <Notice
                        title={query ? t("sxOrgsNoMatch") : t("sxOrgsEmpty")}
                        description={
                            query
                                ? t("sxOrgsNoMatchDescription", { query })
                                : t("sxOrgsEmptyDescription")
                        }
                        action={!query ? newButton : undefined}
                    />
                )}
                {status === "ready" && orgs.length > 0 && (
                    <Group>
                        {orgs.map(o => {
                            const domains = (o.domains || [])
                                .map((d: any) => (typeof d === "string" ? d : d?.name))
                                .filter(Boolean);
                            return (
                                <Row
                                    key={o.id}
                                    onClick={() => navigate(`/${realm}/organizations/${o.id}`)}
                                    leading={
                                        <span className="grid size-8 place-items-center rounded-full bg-[#6e6e73] text-[11px] font-semibold text-white dark:bg-[#48484a]">
                                            {initials(o.name)}
                                        </span>
                                    }
                                    title={o.name}
                                    subtitle={domains.length ? domains.join(", ") : o.alias || "—"}
                                    trailing={
                                        o.enabled === false ? <Chip tone="danger">{t("sxCommonDisabled")}</Chip> : undefined
                                    }
                                />
                            );
                        })}
                    </Group>
                )}
                {status === "ready" && (
                    <div className="mt-3">
                        <Pager
                            page={Math.floor(first / PAGE) + 1}
                            hasPrev={first > 0}
                            hasNext={hasMore}
                            onPrev={() => setFirst(f => Math.max(0, f - PAGE))}
                            onNext={() => setFirst(f => f + PAGE)}
                        />
                    </div>
                )}
            </Section>

            {createOpen && (
                <CreateOrganization
                    onClose={() => setCreateOpen(false)}
                    onCreated={id => {
                        setCreateOpen(false);
                        navigate(`/${realm}/organizations/${id}`);
                    }}
                />
            )}
        </AdminPage>
    );
}

function CreateOrganization({
    onClose,
    onCreated
}: {
    onClose: () => void;
    onCreated: (id: string) => void;
}) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [alias, setAlias] = useState("");
    const [aliasTouched, setAliasTouched] = useState(false);
    const [domains, setDomains] = useState("");
    const [description, setDescription] = useState("");

    const onNameChange = (v: string) => {
        setName(v);
        if (!aliasTouched) setAlias(aliasFromName(v));
    };

    const create = async () => {
        const n = name.trim();
        if (!n) return;
        setSaving(true);
        try {
            const rep: any = {
                name: n,
                alias: alias.trim() || aliasFromName(n) || undefined,
                description: description.trim() || undefined,
                domains: lines(domains).map(d => ({ name: d, verified: false }))
            };
            const created = await adminClient.organizations.create(rep);
            addAlert(t("sxOrgsCreated"), AlertVariant.success);
            onCreated(created.id);
        } catch (e) {
            addError(t("sxOrgsCreateError"), e as Error);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxOrgsNew")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <Field size="lg">
                            <FieldLabel htmlFor="org-name">
                                {t("sxCommonName")}<span className="text-[#d70015] dark:text-[#ff453a]"> *</span>
                            </FieldLabel>
                            <Input
                                size="lg"
                                id="org-name"
                                autoFocus
                                value={name}
                                onChange={(e: any) => onNameChange(e.target.value)}
                                placeholder={t("sxOrgsNamePlaceholder")}
                            />
                        </Field>
                        <Field size="lg">
                            <FieldLabel htmlFor="org-alias">{t("sxOrgsAlias")}</FieldLabel>
                            <Input
                                size="lg"
                                id="org-alias"
                                value={alias}
                                onChange={(e: any) => {
                                    setAliasTouched(true);
                                    setAlias(e.target.value);
                                }}
                                placeholder="acme"
                                className="font-mono"
                            />
                            <FieldDescription>
                                {t("sxOrgsAliasHelp")}
                            </FieldDescription>
                        </Field>
                        <Field size="lg">
                            <FieldLabel htmlFor="org-domains">{t("sxOrgsDomains")}</FieldLabel>
                            <Textarea
                                size="lg"
                                id="org-domains"
                                rows={3}
                                value={domains}
                                onChange={(e: any) => setDomains(e.target.value)}
                                placeholder={"acme.com\nacme.org"}
                            />
                            <FieldDescription>{t("sxOrgsDomainsHelp")}</FieldDescription>
                        </Field>
                        <Field size="lg">
                            <FieldLabel htmlFor="org-description">{t("sxCommonDescription")}</FieldLabel>
                            <Textarea
                                size="lg"
                                id="org-description"
                                rows={2}
                                value={description}
                                onChange={(e: any) => setDescription(e.target.value)}
                                placeholder={t("sxOrgsDescriptionPlaceholder")}
                            />
                        </Field>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button size="form" block disabled={saving || !name.trim()} onClick={create}>
                        {saving ? t("sxCommonCreating") : t("sxCommonCreate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
