// @ts-nocheck

import {
    CaretLeftIcon,
    CaretRightIcon,
    CheckIcon,
    MagnifyingGlassIcon,
    PencilSimpleIcon,
    PlusIcon,
    StackIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { Button } from "@ui/components/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle
} from "@ui/components/empty";
import { Input } from "@ui/components/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@ui/components/input-group";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemSeparator,
    ItemTitle
} from "@ui/components/item";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Spinner } from "@ui/components/spinner";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import {
    Confirm,
    ConfirmAction,
    ConfirmCancel,
    ConfirmContent,
    ConfirmDescription,
    ConfirmFooter,
    ConfirmHeader,
    ConfirmTitle
} from "@ui/patterns/confirm";
import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@ui/patterns/modal";
import { SegmentPicker, SegmentPickerItem } from "@ui/patterns/segment-picker";
import { cn } from "@ui/lib/utils";
import {
    Children,
    cloneElement,
    Fragment,
    isValidElement,
    type ReactNode,
    useCallback,
    useEffect,
    useState
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertVariant, useAlerts } from "../../shared/keycloak-ui-shared";
import { useAdminClient } from "../admin-client";
import ConfigForm from "../components/ConfigForm";
import { useRealm } from "../ui/realm";

const TABS = [
    { value: "settings", label: "Ayarlar" },
    { value: "mappers", label: "Eşleştiriciler" }
];

export default function ClientScopeDetail() {
    const { adminClient } = useAdminClient();
    const { realm } = useRealm();
    const { id } = useParams();
    const navigate = useNavigate();
    const { addError } = useAlerts();

    const [scope, setScope] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("settings");

    const reload = useCallback(async () => {
        try {
            const s = await adminClient.clientScopes.findOne({ id });
            setScope(s ?? null);
        } catch (e) {
            addError("Kapsam yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        setLoading(true);
        reload();
    }, [reload]);

    if (loading)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <div className="flex justify-center py-16">
                    <Spinner className="size-6" />
                </div>
            </div>
        );
    if (!scope)
        return (
            <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
                <EmptyCard icon={<StackIcon />} title="Kapsam bulunamadı" />
            </div>
        );

    return (
        <div className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            {/* iOS nav-bar header */}
            <div className="relative mb-7 flex items-center">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => navigate(`/${realm}/client-scopes`)}
                    aria-label="Geri"
                >
                    <CaretLeftIcon weight="bold" />
                </Button>
                <div className="absolute left-1/2 -translate-x-1/2 text-center">
                    <p className="font-semibold text-foreground">{scope.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                        {scope.protocol || "openid-connect"}
                    </p>
                </div>
            </div>

            <div className="mb-5 flex justify-center">
                <SegmentPicker value={tab} onValueChange={setTab} aria-label="Bölüm">
                    {TABS.map(t => (
                        <SegmentPickerItem key={t.value} value={t.value} label={t.label} />
                    ))}
                </SegmentPicker>
            </div>

            {tab === "settings" && (
                <SettingsTab
                    scope={scope}
                    reload={reload}
                    onDeleted={() => navigate(`/${realm}/client-scopes`)}
                />
            )}
            {tab === "mappers" && <MappersTab scope={scope} />}
        </div>
    );
}

/* ── Settings ─────────────────────────────────────────────────────────── */
function SettingsTab({ scope, reload, onDeleted }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const attrs = scope.attributes || {};
    const [f, setF] = useState({
        name: scope.name || "",
        description: scope.description || "",
        protocol: scope.protocol || "openid-connect",
        onConsent: attrs["display.on.consent.screen"] === "true",
        consentText: attrs["consent.screen.text"] || "",
        inToken: attrs["include.in.token.scope"] !== "false",
        guiOrder: attrs["gui.order"] || ""
    });
    const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
    const [saving, setSaving] = useState(false);

    const save = async () => {
        const name = f.name.trim();
        if (!name) return;
        setSaving(true);
        try {
            const attributes: any = {
                ...(scope.attributes || {}),
                "display.on.consent.screen": f.onConsent ? "true" : "false",
                "include.in.token.scope": f.inToken ? "true" : "false"
            };
            if (f.onConsent && f.consentText.trim())
                attributes["consent.screen.text"] = f.consentText.trim();
            else delete attributes["consent.screen.text"];
            if (f.guiOrder.toString().trim())
                attributes["gui.order"] = f.guiOrder.toString().trim();
            else delete attributes["gui.order"];

            await adminClient.clientScopes.update(
                { id: scope.id },
                {
                    ...scope,
                    name,
                    description: f.description.trim() || undefined,
                    protocol: f.protocol,
                    attributes
                }
            );
            addAlert("Kapsam kaydedildi.", AlertVariant.success);
            reload();
        } catch (e) {
            addError("Kaydedilemedi.", e);
        } finally {
            setSaving(false);
        }
    };

    const remove = () =>
        confirm({
            title: "Kapsamı sil",
            message: `“${scope.name}” kapsamı kalıcı olarak silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clientScopes.del({ id: scope.id });
                    addAlert("Kapsam silindi.", AlertVariant.success);
                    onDeleted();
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <div>
                <GroupLabel>Genel</GroupLabel>
                <Group>
                    <StackRow label="Ad">
                        <Input
                            size="sm"
                            value={f.name}
                            onChange={(e: any) => set("name", e.target.value)}
                            placeholder="kapsam-adi"
                        />
                    </StackRow>
                    <StackRow label="Açıklama">
                        <Textarea
                            value={f.description}
                            onChange={(e: any) => set("description", e.target.value)}
                            placeholder="Bu kapsamın amacı…"
                        />
                    </StackRow>
                    <Row label="Protokol">
                        <Select
                            value={f.protocol}
                            onValueChange={(v: string) => set("protocol", v)}
                        >
                            <SelectTrigger size="sm" aria-label="Protokol">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end" className="z-200">
                                <SelectItem value="openid-connect">
                                    openid-connect
                                </SelectItem>
                                <SelectItem value="saml">saml</SelectItem>
                            </SelectContent>
                        </Select>
                    </Row>
                    <StackRow label="Görünüm sırası (gui.order)">
                        <Input
                            size="sm"
                            value={f.guiOrder}
                            onChange={(e: any) => set("guiOrder", e.target.value)}
                            placeholder="örn. 1"
                        />
                    </StackRow>
                </Group>
            </div>

            <div>
                <GroupLabel>Onay & token</GroupLabel>
                <Group>
                    <SwitchRow
                        label="Onay ekranında göster"
                        hint="Kullanıcı onay ekranında bu kapsam listelenir."
                        checked={f.onConsent}
                        onChange={(v: boolean) => set("onConsent", v)}
                    />
                    {f.onConsent && (
                        <StackRow label="Onay ekranı metni">
                            <Input
                                size="sm"
                                value={f.consentText}
                                onChange={(e: any) => set("consentText", e.target.value)}
                                placeholder="${profile}"
                            />
                        </StackRow>
                    )}
                    <SwitchRow
                        label="Token kapsamına dahil et"
                        hint="Kapsam adı erişim token'ındaki scope claim'ine eklenir."
                        checked={f.inToken}
                        onChange={(v: boolean) => set("inToken", v)}
                    />
                </Group>
                <GroupFooter>
                    Bu ayarlar kapsamın attributes alanında saklanır.
                </GroupFooter>
            </div>

            <div className="flex justify-end">
                <Button disabled={saving || !f.name.trim()} onClick={save}>
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
            </div>

            <div>
                <GroupLabel>Tehlikeli bölge</GroupLabel>
                <Group>
                    <ActionRow danger onClick={remove}>
                        Kapsamı sil
                    </ActionRow>
                </Group>
                <GroupFooter>
                    Kapsam ve tüm eşleştiricileri kalıcı olarak silinir.
                </GroupFooter>
            </div>
            {confirmNode}
        </div>
    );
}

/* ── Mappers ──────────────────────────────────────────────────────────── */
function MappersTab({ scope }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [confirm, confirmNode] = useConfirmDialog();

    const id = scope.id;
    const protocol = scope.protocol || "openid-connect";

    const [mappers, setMappers] = useState<any[]>([]);
    const [serverInfo, setServerInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<any>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [m, si] = await Promise.all([
                adminClient.clientScopes.listProtocolMappers({ id }).catch(() => []),
                adminClient.serverInfo.find().catch(() => null)
            ]);
            setMappers(Array.isArray(m) ? m : []);
            setServerInfo(si);
        } catch (e) {
            addError("Eşleştiriciler yüklenemedi.", e);
        } finally {
            setLoading(false);
        }
    }, [adminClient, id, addError]);

    useEffect(() => {
        load();
    }, [load]);

    const mapperTypes: any[] = serverInfo?.protocolMapperTypes?.[protocol] || [];
    const builtins: any[] = serverInfo?.builtinProtocolMappers?.[protocol] || [];

    const deleteMapper = (m: any) =>
        confirm({
            title: "Eşleştiriciyi sil",
            message: `“${m.name}” eşleştiricisi silinecek.`,
            confirmLabel: "Sil",
            danger: true,
            onConfirm: async () => {
                try {
                    await adminClient.clientScopes.delProtocolMapper({
                        id,
                        mapperId: m.id
                    });
                    addAlert("Eşleştirici silindi.", AlertVariant.success);
                    setMappers(mappers.filter(x => x.id !== m.id));
                } catch (e) {
                    addError("Silinemedi.", e);
                }
            }
        });

    if (loading)
        return (
            <div className="flex justify-center py-16">
                <Spinner className="size-6" />
            </div>
        );

    return (
        <div className="mx-auto max-w-xl space-y-3">
            <div className="flex items-center justify-between">
                <GroupLabel>{mappers.length} eşleştirici</GroupLabel>
                <Button variant="plain" size="sm" onClick={() => setAdding(true)}>
                    <PlusIcon /> Ekle
                </Button>
            </div>
            {mappers.length === 0 ? (
                <EmptyCard
                    icon={<StackIcon weight="fill" />}
                    title="Eşleştirici yok"
                    desc="Token'a claim eklemek için bir eşleştirici ekleyin."
                    action={
                        <Button variant="secondary" onClick={() => setAdding(true)}>
                            Ekle
                        </Button>
                    }
                />
            ) : (
                <Group>
                    {mappers.map(m => (
                        <Item key={m.id} size="sm">
                            <ItemContent
                                className="min-w-0 cursor-pointer"
                                onClick={() => setEditing(m)}
                            >
                                <ItemTitle>{m.name}</ItemTitle>
                                <ItemDescription className="truncate">
                                    {m.protocolMapper}
                                </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setEditing(m)}
                                    aria-label="Düzenle"
                                    title="Düzenle"
                                >
                                    <PencilSimpleIcon />
                                </Button>
                                <RowDelete onClick={() => deleteMapper(m)} />
                            </ItemActions>
                        </Item>
                    ))}
                </Group>
            )}

            {adding && (
                <AddMapperModal
                    id={id}
                    protocol={protocol}
                    mapperTypes={mapperTypes}
                    builtins={builtins}
                    existing={mappers}
                    onClose={() => setAdding(false)}
                    onDone={() => {
                        setAdding(false);
                        load();
                    }}
                />
            )}
            {editing && (
                <EditMapperModal
                    id={id}
                    mapper={editing}
                    mapperTypes={mapperTypes}
                    onClose={() => setEditing(null)}
                    onDone={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
            {confirmNode}
        </div>
    );
}

/* config helpers: KC stores config as { [name]: string }; ConfigForm uses { [name]: string[] } */
function configToForm(config: any) {
    const out: any = {};
    Object.entries(config || {}).forEach(([k, v]: any) => {
        if (Array.isArray(v)) out[k] = v.map(String);
        else if (typeof v === "string" && v.includes("##")) out[k] = v.split("##");
        else out[k] = [String(v ?? "")];
    });
    return out;
}
function formToConfig(form: any) {
    const config: any = {};
    for (const [k, v] of Object.entries(form || {})) {
        config[k] = Array.isArray(v)
            ? v.length <= 1
                ? (v[0] ?? "")
                : v.join("##")
            : String(v ?? "");
    }
    return config;
}

function AddMapperModal({
    id,
    protocol,
    mapperTypes,
    builtins,
    existing,
    onClose,
    onDone
}: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [view, setView] = useState("choose"); // choose | predefined | pickType | config
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pickedType, setPickedType] = useState<any>(null);
    const [name, setName] = useState("");
    const [config, setConfig] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const existingNames = new Set((existing || []).map((m: any) => m.name));
    const availBuiltins = (builtins || []).filter((b: any) => !existingNames.has(b.name));
    const filteredBuiltins = availBuiltins.filter((b: any) =>
        (b.name || "").toLowerCase().includes(search.toLowerCase())
    );
    const filteredTypes = (mapperTypes || []).filter((t: any) =>
        (t.name || "").toLowerCase().includes(search.toLowerCase())
    );

    const toggleSel = (n: string) =>
        setSelected(prev => {
            const next = new Set(prev);
            next.has(n) ? next.delete(n) : next.add(n);
            return next;
        });

    const addPredefined = async () => {
        const reps = availBuiltins
            .filter((b: any) => selected.has(b.name))
            .map((b: any) => ({ ...b, id: undefined }));
        if (!reps.length) return;
        setSaving(true);
        try {
            await adminClient.clientScopes.addMultipleProtocolMappers({ id }, reps);
            addAlert(`${reps.length} eşleştirici eklendi.`, AlertVariant.success);
            onDone();
        } catch (e) {
            addError("Eklenemedi.", e);
            setSaving(false);
        }
    };

    const saveNew = async () => {
        if (!name.trim() || !pickedType) return;
        setSaving(true);
        try {
            await adminClient.clientScopes.addProtocolMapper(
                { id },
                {
                    name: name.trim(),
                    protocol,
                    protocolMapper: pickedType.id,
                    config: formToConfig(config)
                }
            );
            addAlert("Eşleştirici eklendi.", AlertVariant.success);
            onDone();
        } catch (e) {
            addError("Eklenemedi.", e);
            setSaving(false);
        }
    };

    const SubBack = ({ to, children }: any) => (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => {
                setSearch("");
                setView(to);
            }}
        >
            <CaretLeftIcon weight="bold" />
            {children}
        </Button>
    );

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Eşleştirici ekle</ModalTitle>
                </ModalHeader>
                <ModalBody className="space-y-4">
                {view === "choose" ? (
                    <Group>
                        <Item size="sm" asChild>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setSelected(new Set());
                                    setView("predefined");
                                }}
                            >
                                <ItemContent>
                                    <ItemTitle>Hazır eşleştirici ekle</ItemTitle>
                                    <ItemDescription>Standart claim'leri listeden seç</ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <CaretRightIcon weight="bold" className="rtl:rotate-180" />
                                </ItemActions>
                            </button>
                        </Item>
                        <Item size="sm" asChild>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setView("pickType");
                                }}
                            >
                                <ItemContent>
                                    <ItemTitle>Yeni eşleştirici yapılandır</ItemTitle>
                                    <ItemDescription>Bir tip seçip özel claim oluştur</ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    <CaretRightIcon weight="bold" className="rtl:rotate-180" />
                                </ItemActions>
                            </button>
                        </Item>
                    </Group>
                ) : view === "predefined" ? (
                    <div className="space-y-3">
                        <SubBack to="choose">Geri</SubBack>
                        <InputGroup>
                            <InputGroupAddon>
                                <MagnifyingGlassIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                value={search}
                                onChange={(e: any) => setSearch(e.target.value)}
                                placeholder="Eşleştirici ara…"
                            />
                        </InputGroup>
                        <div className="max-h-72 overflow-y-auto">
                            {filteredBuiltins.length === 0 ? (
                                <EmptyRow>Eklenebilecek hazır eşleştirici yok.</EmptyRow>
                            ) : (
                                <Group>
                                    {filteredBuiltins.map((b: any) => {
                                        const on = selected.has(b.name);
                                        return (
                                            <Item key={b.name} size="sm" asChild>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSel(b.name)}
                                                >
                                                    <ItemContent className="min-w-0">
                                                        <ItemTitle>{b.name}</ItemTitle>
                                                    </ItemContent>
                                                    {on && (
                                                        <ItemActions>
                                                            <CheckIcon
                                                                weight="bold"
                                                                className="text-primary"
                                                            />
                                                        </ItemActions>
                                                    )}
                                                </button>
                                            </Item>
                                        );
                                    })}
                                </Group>
                            )}
                        </div>
                        <Button
                            block
                            disabled={saving || selected.size === 0}
                            onClick={addPredefined}
                        >
                            {saving
                                ? "Ekleniyor…"
                                : selected.size > 0
                                  ? `Ekle (${selected.size})`
                                  : "Ekle"}
                        </Button>
                    </div>
                ) : view === "pickType" ? (
                    <div className="space-y-3">
                        <SubBack to="choose">Geri</SubBack>
                        <InputGroup>
                            <InputGroupAddon>
                                <MagnifyingGlassIcon />
                            </InputGroupAddon>
                            <InputGroupInput
                                value={search}
                                onChange={(e: any) => setSearch(e.target.value)}
                                placeholder="Eşleştirici tipi ara…"
                            />
                        </InputGroup>
                        <div className="max-h-72 overflow-y-auto">
                            {filteredTypes.length === 0 ? (
                                <EmptyRow>Eşleştirici tipi yok.</EmptyRow>
                            ) : (
                                <Group>
                                    {filteredTypes.map((t: any) => (
                                        <Item key={t.id} size="sm" asChild>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPickedType(t);
                                                    setName(t.name || "");
                                                    setConfig({});
                                                    setView("config");
                                                }}
                                            >
                                                <ItemContent className="min-w-0">
                                                    <ItemTitle>{t.name}</ItemTitle>
                                                    {t.category && (
                                                        <ItemDescription className="truncate">
                                                            {t.category}
                                                        </ItemDescription>
                                                    )}
                                                </ItemContent>
                                                <ItemActions>
                                                    <CaretRightIcon
                                                        weight="bold"
                                                        className="rtl:rotate-180"
                                                    />
                                                </ItemActions>
                                            </button>
                                        </Item>
                                    ))}
                                </Group>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <SubBack to="pickType">{pickedType?.name}</SubBack>
                        <Group>
                            <Row label="Ad">
                                <Input
                                    size="sm"
                                    value={name}
                                    onChange={(e: any) => setName(e.target.value)}
                                    placeholder="Eşleştirici adı"
                                />
                            </Row>
                        </Group>
                        <ConfigForm
                            properties={pickedType?.properties}
                            value={config}
                            onChange={(n: string, v: string[]) =>
                                setConfig((c: any) => ({ ...c, [n]: v }))
                            }
                        />
                        <Button
                            block
                            disabled={saving || !name.trim()}
                            onClick={saveNew}
                        >
                            {saving ? "Kaydediliyor…" : "Kaydet"}
                        </Button>
                    </div>
                )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

function EditMapperModal({ id, mapper, mapperTypes, onClose, onDone }: any) {
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const type = (mapperTypes || []).find((t: any) => t.id === mapper.protocolMapper);
    const [name, setName] = useState(mapper.name || "");
    const [config, setConfig] = useState<any>(configToForm(mapper.config));
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            await adminClient.clientScopes.updateProtocolMapper(
                { id, mapperId: mapper.id },
                { ...mapper, name: name.trim(), config: formToConfig(config) }
            );
            addAlert("Eşleştirici güncellendi.", AlertVariant.success);
            onDone();
        } catch (e) {
            addError("Güncellenemedi.", e);
            setSaving(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent className="sm:max-w-2xl">
                <ModalHeader>
                    <ModalTitle>Eşleştiriciyi düzenle</ModalTitle>
                </ModalHeader>
                <ModalBody className="space-y-4">
                <Group>
                    <Row label="Ad">
                        <Input
                                    size="sm"
                            value={name}
                            onChange={(e: any) => setName(e.target.value)}
                            placeholder="Eşleştirici adı"
                        />
                    </Row>
                    <Row label="Tip">
                        <span className="truncate text-sm text-muted-foreground">
                            {type?.name || mapper.protocolMapper}
                        </span>
                    </Row>
                </Group>
                <ConfigForm
                    properties={type?.properties}
                    value={config}
                    onChange={(n: string, v: string[]) =>
                        setConfig((c: any) => ({ ...c, [n]: v }))
                    }
                />
                <Button
                    block
                    disabled={saving || !name.trim()}
                    onClick={save}
                >
                    {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
}

/* ── esuiss inset-list helpers (thin compositions of @ui Item/Empty/Confirm) ── */

/** Confirm dialog — returns a [confirm(opts), node] pair (built on @ui/patterns/confirm). */
function useConfirmDialog() {
    const [open, setOpen] = useState(false);
    const [state, setState] = useState<any>(null);
    const confirm = (opts: {
        title: ReactNode;
        message?: ReactNode;
        confirmLabel?: ReactNode;
        danger?: boolean;
        onConfirm: () => void;
    }) => {
        setState(opts);
        setOpen(true);
    };
    const node = (
        <Confirm open={open} onOpenChange={setOpen}>
            <ConfirmContent>
                <ConfirmHeader>
                    <ConfirmTitle>{state?.title}</ConfirmTitle>
                    {state?.message && (
                        <ConfirmDescription>{state.message}</ConfirmDescription>
                    )}
                </ConfirmHeader>
                <ConfirmFooter>
                    <ConfirmCancel>Vazgeç</ConfirmCancel>
                    <ConfirmAction
                        variant={state?.danger ? "destructive" : "default"}
                        onClick={() => {
                            const fn = state?.onConfirm;
                            setOpen(false);
                            fn?.();
                        }}
                    >
                        {state?.confirmLabel ?? "Onayla"}
                    </ConfirmAction>
                </ConfirmFooter>
            </ConfirmContent>
        </Confirm>
    );
    return [confirm, node] as const;
}

/** Flattens fragments so every row of a group gets its own separator. */
function flattenRows(children: any, prefix = ""): any[] {
    return Children.toArray(children).flatMap((c: any) =>
        isValidElement(c) && c.type === Fragment
            ? flattenRows((c.props as any).children, `${prefix}${c.key}/`)
            : [prefix && isValidElement(c) ? cloneElement(c, { key: prefix + c.key }) : c]
    );
}

/** Quiet caption above a group. */
function GroupLabel({ children, className }: any) {
    return (
        <h3 className={cn("mb-2 ms-1 text-sm font-medium text-muted-foreground", className)}>
            {children}
        </h3>
    );
}

/** Footnote below a group. */
function GroupFooter({ children }: any) {
    return <p className="mt-2 ms-1 text-sm text-muted-foreground">{children}</p>;
}

/** Inset list — rows separated by ItemSeparator. */
function Group({ children, className }: any) {
    const rows = flattenRows(children);
    return (
        <ItemGroup variant="inset" className={className}>
            {rows.map((row: any, i: number) => (
                <Fragment key={row?.key ?? i}>
                    {i > 0 && <ItemSeparator />}
                    {row}
                </Fragment>
            ))}
        </ItemGroup>
    );
}

/** Label-left / control-right row. */
function Row({ label, hint, children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="flex-none">
                <ItemTitle>{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            <ItemActions className="min-w-0 flex-1 justify-end">{children}</ItemActions>
        </Item>
    );
}

/** Label on top, full-width control below. */
function StackRow({ label, hint, children }: any) {
    return (
        <Item size="sm">
            {(label || hint) && (
                <ItemContent>
                    {label && <ItemTitle>{label}</ItemTitle>}
                    {hint && <ItemDescription>{hint}</ItemDescription>}
                </ItemContent>
            )}
            <div className="basis-full">{children}</div>
        </Item>
    );
}

/** Switch row (label-left / switch-right). */
function SwitchRow({ label, hint, checked, onChange, disabled }: any) {
    return (
        <Item size="sm">
            <ItemContent>
                <ItemTitle>{label}</ItemTitle>
                {hint && <ItemDescription>{hint}</ItemDescription>}
            </ItemContent>
            <ItemActions>
                <Switch
                    checked={!!checked}
                    disabled={disabled}
                    aria-label={typeof label === "string" ? label : undefined}
                    onCheckedChange={(v: boolean) => onChange(v)}
                />
            </ItemActions>
        </Item>
    );
}

/** Full-width tappable action row. */
function ActionRow({ onClick, disabled, danger, children }: any) {
    return (
        <Item size="sm" asChild>
            <button type="button" onClick={onClick} disabled={disabled}>
                <ItemContent>
                    <ItemTitle className={danger ? "text-destructive" : "text-primary"}>
                        {children}
                    </ItemTitle>
                </ItemContent>
            </button>
        </Item>
    );
}

/** Delete icon button for list rows. */
function RowDelete({ onClick, title = "Sil" }: any) {
    return (
        <Button variant="ghost" size="icon-sm" onClick={onClick} title={title} aria-label={title}>
            <TrashIcon />
        </Button>
    );
}

/** Empty state. */
function EmptyCard({ icon, title, desc, action }: any) {
    return (
        <Empty>
            <EmptyHeader>
                {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
                <EmptyTitle>{title}</EmptyTitle>
                {desc && <EmptyDescription>{desc}</EmptyDescription>}
            </EmptyHeader>
            {action && <EmptyContent>{action}</EmptyContent>}
        </Empty>
    );
}

/** "No items" placeholder row inside a group. */
function EmptyRow({ children }: any) {
    return (
        <Item size="sm">
            <ItemContent className="items-center">
                <ItemDescription>{children}</ItemDescription>
            </ItemContent>
        </Item>
    );
}
