// @ts-nocheck

import {
    BuildingsIcon,
    CaretRightIcon,
    MagnifyingGlassIcon
} from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@ui/components/avatar";
import { Button } from "@ui/components/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel
} from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput
} from "@ui/components/input-group";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import { Spinner } from "@ui/components/spinner";
import { Textarea } from "@ui/components/textarea";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { Fragment, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import { useRealm } from "../ui/realm";
import { initials } from "../ui/util";

const PAGE = 20;
const lines = (s: string) =>
    s
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);

/** Auto-derive an alias from a name (lowercase, dashed, ascii-safe). */
const aliasFromName = (name: string) =>
    name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-");

export default function Organizations() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const navigate = useNavigate();
    const { addError } = useAlerts();

    const [loading, setLoading] = useState(true);
    const [orgs, setOrgs] = useState<any[]>([]);
    const [first, setFirst] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [query, setQuery] = useState("");
    const [createOpen, setCreateOpen] = useState(false);

    const load = async (firstArg = first, q = query) => {
        setLoading(true);
        try {
            const params: any = { first: firstArg, max: PAGE + 1 };
            if (q.trim()) params.search = q.trim();
            const list = (await adminClient.organizations.find(params)) ?? [];
            setHasMore(list.length > PAGE);
            setOrgs(list.slice(0, PAGE));
        } catch (e) {
            addError("Organizasyonlar yüklenemedi.", e as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setFirst(0);
        load(0, query);
        // eslint-disable-next-line
    }, [query, load]);

    // Debounced live search.
    useEffect(() => {
        const id = setTimeout(() => setQuery(searchInput.trim()), 300);
        return () => clearTimeout(id);
    }, [searchInput]);

    const page = (dir: number) => {
        const f = Math.max(0, first + dir * PAGE);
        setFirst(f);
        load(f, query);
    };

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-7">
                <h1 className="font-semibold text-3xl text-foreground tracking-tight">
                    Organizasyonlar
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Realm’inizdeki organizasyonlar, üyeleri ve kimlik sağlayıcıları.
                </p>
            </div>

            {/* Toolbar */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <InputGroup className="w-full sm:w-80">
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        type="text"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Organizasyon ara"
                    />
                </InputGroup>
                <div className="sm:ml-auto">
                    <Button type="button" onClick={() => setCreateOpen(true)}>
                        Yeni organizasyon
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="grid place-items-center py-16">
                    <Spinner />
                </div>
            ) : orgs.length === 0 ? (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BuildingsIcon />
                        </EmptyMedia>
                        <EmptyTitle>
                            {query ? "Sonuç bulunamadı" : "Henüz organizasyon yok"}
                        </EmptyTitle>
                        <EmptyDescription>
                            {query
                                ? `“${query}” ile eşleşen bir organizasyon yok.`
                                : "Üyeleri ve kimlik sağlayıcıları gruplamak için ilk organizasyonunu oluştur."}
                        </EmptyDescription>
                    </EmptyHeader>
                    {!query && (
                        <EmptyContent>
                            <Button type="button" onClick={() => setCreateOpen(true)}>
                                Yeni organizasyon
                            </Button>
                        </EmptyContent>
                    )}
                </Empty>
            ) : (
                <div className="space-y-4">
                    <ItemGroup variant="inset">
                        {orgs.map((o, i) => {
                            const domains = (o.domains || [])
                                .map((d: any) => (typeof d === "string" ? d : d?.name))
                                .filter(Boolean);
                            return (
                                <Fragment key={o.id}>
                                    {i > 0 && <ItemSeparator />}
                                    <Item size="sm" asChild>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(`/${realm}/organizations/${o.id}`)
                                            }
                                        >
                                            <ItemMedia>
                                                <Avatar>
                                                    <AvatarFallback>
                                                        {initials(o.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </ItemMedia>
                                            <ItemContent className="min-w-0">
                                                <ItemTitle>{o.name}</ItemTitle>
                                                <ItemDescription className="truncate">
                                                    {domains.length
                                                        ? domains.join(", ")
                                                        : o.alias || "—"}
                                                </ItemDescription>
                                            </ItemContent>
                                            <ItemActions>
                                                <CaretRightIcon className="text-muted-foreground" />
                                            </ItemActions>
                                        </button>
                                    </Item>
                                </Fragment>
                            );
                        })}
                    </ItemGroup>
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm text-muted-foreground tabular-nums">
                            {`${first + 1}–${first + orgs.length}`}
                        </span>
                        <div className="flex gap-1.5">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={first === 0}
                                onClick={() => page(-1)}
                            >
                                Önceki
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={!hasMore}
                                onClick={() => page(1)}
                            >
                                Sonraki
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {createOpen && (
                <CreateOrganization
                    onClose={() => setCreateOpen(false)}
                    onCreated={id => {
                        setCreateOpen(false);
                        navigate(`/${realm}/organizations/${id}`);
                    }}
                />
            )}
        </div>
    );
}

function CreateOrganization({
    onClose,
    onCreated
}: {
    onClose: () => void;
    onCreated: (id: string) => void;
}) {
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
            addAlert("Organizasyon oluşturuldu.", AlertVariant.success);
            onCreated(created.id);
        } catch (e) {
            addError("Organizasyon oluşturulamadı.", e as Error);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Yeni organizasyon</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="org-name">
                                Ad<span className="text-destructive"> *</span>
                            </FieldLabel>
                            <Input
                                id="org-name"
                                autoFocus
                                value={name}
                                onChange={(e: any) => onNameChange(e.target.value)}
                                placeholder="örn. Acme A.Ş."
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="org-alias">Takma ad (alias)</FieldLabel>
                            <Input
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
                                Boş bırakılırsa addan türetilir. Sonradan değiştirilemez.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="org-domains">Alan adları</FieldLabel>
                            <Textarea
                                id="org-domains"
                                rows={3}
                                value={domains}
                                onChange={(e: any) => setDomains(e.target.value)}
                                placeholder={"acme.com\nacme.org"}
                            />
                            <FieldDescription>Her satıra bir alan adı.</FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="org-description">Açıklama</FieldLabel>
                            <Textarea
                                id="org-description"
                                rows={2}
                                value={description}
                                onChange={(e: any) => setDescription(e.target.value)}
                                placeholder="Kısa açıklama"
                            />
                        </Field>
                    </FieldGroup>
                </ModalBody>
                <ModalFooter>
                    <Button
                        type="button"
                        disabled={saving || !name.trim()}
                        onClick={create}
                    >
                        {saving ? "Oluşturuluyor…" : "Oluştur"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
