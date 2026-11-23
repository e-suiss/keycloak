// @ts-nocheck
// Shared bits for the Workflows list + detail pages: raw REST helper, YAML⇄model
// conversion, the live provider palette hook, and the visual/YAML editor.

import {
    ArrowDownIcon,
    CaretDownIcon,
    CaretRightIcon,
    CaretUpIcon,
    FlowArrowIcon,
    FunnelIcon,
    LightningIcon,
    PlusIcon,
    TrashIcon
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Trans } from "react-i18next";
import ReactFlow, {
    Background,
    BaseEdge,
    Controls,
    EdgeLabelRenderer,
    getSmoothStepPath,
    Handle,
    Position,
    useNodesState
} from "reactflow";
import yaml from "yaml";
import "reactflow/dist/style.css";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@ui/components/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@ui/components/dropdown-menu";
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldTitle
} from "@ui/components/field";
import { Input } from "@ui/components/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@ui/components/select";
import { Separator } from "@ui/components/separator";
import { Switch } from "@ui/components/switch";
import { Textarea } from "@ui/components/textarea";
import { cn } from "@ui/lib/utils";
import { SegmentPicker, SegmentPickerItem } from "@ui/patterns/segment-picker";
import { useAdminClient } from "../admin-client";
import { useT } from "../ui/i18n";
import { GROUP, SegmentTabs, SEPARATOR } from "../ui/kit";

const PANEL =
    "rounded-xl border border-[#e5e5ea] bg-[#f5f5f7] shadow-none ring-0 dark:border-[#38383a] dark:bg-[#1c1c1e]";
const PANEL_INNER =
    "rounded-lg border border-[#e5e5ea] bg-white shadow-none ring-0 dark:border-[#38383a] dark:bg-[#2c2c2e]";

export const EVENT_LABELS: Record<string, string> = {
    "user-created": "sxWorkflowLibEventUserCreated",
    "user-authenticated": "sxWorkflowLibEventUserAuthenticated",
    "user-role-granted": "sxWorkflowLibEventUserRoleGranted",
    "user-role-revoked": "sxWorkflowLibEventUserRoleRevoked",
    "user-group-membership-added": "sxWorkflowLibEventUserGroupAdded",
    "user-group-membership-removed": "sxWorkflowLibEventUserGroupRemoved",
    "user-federated-identity-added": "sxWorkflowLibEventUserIdpAdded",
    "user-federated-identity-removed": "sxWorkflowLibEventUserIdpRemoved",
    "client-created": "sxWorkflowLibEventClientCreated",
    "client-authenticated": "sxWorkflowLibEventClientAuthenticated"
};
export const STEP_LABELS: Record<string, string> = {
    "notify-user": "sxWorkflowLibStepNotifyUser",
    "set-user-attribute": "sxWorkflowLibStepSetAttribute",
    "remove-user-attribute": "sxWorkflowLibStepRemoveAttribute",
    "grant-role": "sxWorkflowLibStepGrantRole",
    "revoke-role": "sxWorkflowLibStepRevokeRole",
    "join-group": "sxWorkflowLibStepJoinGroup",
    "leave-group": "sxWorkflowLibStepLeaveGroup",
    "add-required-action": "sxWorkflowLibStepAddRequiredAction",
    "remove-required-action": "sxWorkflowLibStepRemoveRequiredAction",
    "disable-user": "sxWorkflowLibStepDisableUser",
    "delete-user": "sxWorkflowLibStepDeleteUser",
    "disable-client": "sxWorkflowLibStepDisableClient",
    "delete-client": "sxWorkflowLibStepDeleteClient",
    "unlink-user": "sxWorkflowLibStepUnlinkUser",
    restart: "sxWorkflowLibStepRestart"
};
export const COND_LABELS: Record<string, string> = {
    "has-role": "sxWorkflowLibCondHasRole",
    "is-member-of": "sxWorkflowLibCondIsMemberOf",
    "has-user-attribute": "sxWorkflowLibCondHasAttribute",
    "has-identity-provider-link": "sxWorkflowLibCondHasIdpLink"
};
const LABEL_MAPS: Record<string, Record<string, string>> = {
    event: EVENT_LABELS,
    step: STEP_LABELS,
    cond: COND_LABELS
};
const labelOf = (t: any, map: any, id: string) => (map[id] ? t(map[id]) : id);

export function issueText(t: any, e: any) {
    const params: any = { ...(e.msgParams || {}) };
    if (e.stepId) params.step = labelOf(t, STEP_LABELS, e.stepId);
    if (e.condId) params.cond = labelOf(t, COND_LABELS, e.condId);
    return { where: t(e.where, e.whereParams), msg: t(e.msg, params) };
}

// Exact `with` config keys per step, decompiled from Keycloak 26.6 step providers.
const REQUIRED_ACTIONS = [
    "VERIFY_EMAIL",
    "UPDATE_PASSWORD",
    "UPDATE_PROFILE",
    "CONFIGURE_TOTP",
    "TERMS_AND_CONDITIONS",
    "VERIFY_PROFILE",
    "delete_account",
    "update_user_locale",
    "webauthn-register",
    "CONFIGURE_RECOVERY_AUTHN_CODES"
];
const STEP_FIELDS: Record<string, any[]> = {
    "grant-role": [
        {
            key: "role",
            label: "sxWorkflowLibFieldRole",
            placeholder: "sxWorkflowLibPhRole",
            help: "sxWorkflowLibHelpGrantRole"
        }
    ],
    "revoke-role": [
        {
            key: "role",
            label: "sxWorkflowLibFieldRole",
            placeholder: "sxWorkflowLibPhRole",
            help: "sxWorkflowLibHelpRevokeRole"
        }
    ],
    "join-group": [
        {
            key: "group",
            label: "sxWorkflowLibFieldGroup",
            placeholder: "sxWorkflowLibPhGroup",
            help: "sxWorkflowLibHelpGroupPath"
        }
    ],
    "leave-group": [
        {
            key: "group",
            label: "sxWorkflowLibFieldGroup",
            placeholder: "sxWorkflowLibPhGroup",
            help: "sxWorkflowLibHelpGroupPath"
        }
    ],
    "remove-user-attribute": [
        {
            key: "attribute",
            label: "sxWorkflowLibFieldAttribute",
            placeholder: "sxWorkflowLibPhAttribute",
            help: "sxWorkflowLibHelpRemoveAttribute"
        }
    ],
    "add-required-action": [{ key: "action", label: "sxWorkflowLibFieldRequiredAction", type: "action" }],
    "remove-required-action": [{ key: "action", label: "sxWorkflowLibFieldRequiredAction", type: "action" }],
    "notify-user": [
        { key: "subject", label: "sxWorkflowLibFieldSubject", placeholder: "sxWorkflowLibPhSubject" },
        {
            key: "message",
            label: "sxWorkflowLibFieldMessage",
            type: "textarea",
            placeholder: "sxWorkflowLibPhMessage"
        },
        { key: "to", label: "sxWorkflowLibFieldRecipient", placeholder: "sxWorkflowLibPhRecipient" }
    ]
};
const STEP_DYNAMIC = new Set(["set-user-attribute"]); // with keys = attribute names
const STEP_NOPARAM = new Set([
    "disable-user",
    "delete-user",
    "disable-client",
    "delete-client",
    "unlink-user",
    "restart"
]);

// Resource type gating: a workflow's subject is a user or a client, decided by its
// trigger. Steps only make sense for the matching resource type.
const CLIENT_EVENTS = new Set(["client-created", "client-authenticated"]);
const CLIENT_STEPS = new Set(["disable-client", "delete-client"]);
const BOTH_STEPS = new Set(["restart"]);
export const workflowResource = (m: any) =>
    m.on?.some((o: any) => CLIENT_EVENTS.has(o.uses)) ? "clients" : "users";
const stepResource = (uses: string) =>
    CLIENT_STEPS.has(uses) ? "clients" : BOTH_STEPS.has(uses) ? "both" : "users";
export const stepAllowed = (uses: string, resource: string) => {
    const r = stepResource(uses);
    return r === "both" || r === resource;
};
const allowedSteps = (palette: any, resource: string) =>
    (palette.steps?.length ? palette.steps : Object.keys(STEP_LABELS)).filter(
        (u: string) => stepAllowed(u, resource)
    );

// All 4 condition providers evaluate a USER → conditions only apply to user
// workflows. Client-triggered workflows have no applicable conditions.
export const condAllowed = (resource: string) => resource === "users";
const allowedConds = (palette: any, resource: string) =>
    resource === "users"
        ? palette.conditions?.length
            ? palette.conditions
            : Object.keys(COND_LABELS)
        : [];

function stepSummary(uses: string, w: any) {
    if (!w) return "";
    if (STEP_DYNAMIC.has(uses))
        return Object.entries(w)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ");
    const f = STEP_FIELDS[uses]?.[0];
    return f && w[f.key] ? String(w[f.key]) : "";
}

/** Per-step delay (`after`). Optional for most steps; `restart` is only valid
 *  when an EARLIER step is scheduled, so it leans on this. */
function DelayField({ uses, value, onChange }: any) {
    const t = useT();
    return (
        <>
            <Separator />
            <Field>
                <FieldLabel>
                    {uses === "restart"
                        ? t("sxWorkflowLibDelayLabel")
                        : t("sxWorkflowLibDelayLabelOptional")}
                </FieldLabel>
                <Input
                    size="sm"
                    value={value ?? ""}
                    onChange={(e: any) => onChange(e.target.value)}
                    placeholder={t("sxWorkflowLibDelayPlaceholder")}
                />
                <FieldDescription>
                    {uses === "restart"
                        ? t("sxWorkflowLibDelayHelpRestart")
                        : t("sxWorkflowLibDelayHelp")}
                </FieldDescription>
            </Field>
        </>
    );
}

/** Per-step config editor with the exact keys each step provider reads. */
function StepConfig({ uses, value, onChange, after, onAfter }: any) {
    const t = useT();
    if (!uses) return null;
    const set = (k: string, v: any) => onChange({ ...(value || {}), [k]: v });
    const fields = STEP_FIELDS[uses];
    let body: any;
    if (STEP_NOPARAM.has(uses))
        body = (
            <p className="text-sm text-muted-foreground">{t("sxWorkflowLibStepNoParams")}</p>
        );
    else if (STEP_DYNAMIC.has(uses))
        body = (
            <div>
                <p className="mb-1.5 text-sm text-muted-foreground">
                    {t("sxWorkflowLibStepAttributesHint")}
                </p>
                <WithEditor value={value} onChange={onChange} />
            </div>
        );
    else if (!fields) body = <WithEditor value={value} onChange={onChange} />;
    else
        body = (
            <FieldGroup className="gap-3">
                {fields.map((f: any) => (
                    <Field key={f.key}>
                        <FieldLabel>{t(f.label)}</FieldLabel>
                        {f.type === "textarea" ? (
                            <Textarea
                                value={value?.[f.key] ?? ""}
                                onChange={(e: any) => set(f.key, e.target.value)}
                                placeholder={f.placeholder ? t(f.placeholder) : undefined}
                                rows={2}
                            />
                        ) : f.type === "action" ? (
                            <Select
                                value={value?.[f.key] || "__none__"}
                                onValueChange={(v: string) =>
                                    set(f.key, v === "__none__" ? "" : v)
                                }
                            >
                                <SelectTrigger size="sm" className="w-full">
                                    <SelectValue placeholder={t("sxWorkflowLibSelectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {REQUIRED_ACTIONS.map(a => (
                                        <SelectItem key={a} value={a}>
                                            {a}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                size="sm"
                                value={value?.[f.key] ?? ""}
                                onChange={(e: any) => set(f.key, e.target.value)}
                                placeholder={f.placeholder ? t(f.placeholder) : undefined}
                            />
                        )}
                        {f.help && <FieldDescription>{t(f.help)}</FieldDescription>}
                    </Field>
                ))}
            </FieldGroup>
        );
    return (
        <div className="flex flex-col gap-3">
            {body}
            {onAfter && <DelayField uses={uses} value={after} onChange={onAfter} />}
        </div>
    );
}

/* Per-condition editor: the function's positional args + a NOT toggle. */
function CondConfig({ it, onChange }: any) {
    const t = useT();
    const fields = COND_FIELDS[it.uses] || [];
    const setArg = (k: string, v: any) =>
        onChange({ ...it, args: { ...(it.args || {}), [k]: v } });
    return (
        <div className="flex flex-col gap-3">
            {it.uses ? (
                fields.map((f: any) => (
                    <Field key={f.key}>
                        <FieldLabel>{t(f.label)}</FieldLabel>
                        <Input
                            size="sm"
                            value={it.args?.[f.key] ?? ""}
                            onChange={(e: any) => setArg(f.key, e.target.value)}
                            placeholder={t(f.placeholder)}
                        />
                    </Field>
                ))
            ) : (
                <p className="text-sm text-muted-foreground">{t("sxWorkflowLibCondPickFirst")}</p>
            )}
            <Separator />
            <Field orientation="horizontal">
                <FieldContent>
                    <FieldTitle className="text-sm">{t("sxWorkflowLibCondNot")}</FieldTitle>
                    <FieldDescription>{t("sxWorkflowLibCondNotHint")}</FieldDescription>
                </FieldContent>
                <Switch
                    checked={!!it.not}
                    onCheckedChange={(v: boolean) => onChange({ ...it, not: v })}
                    aria-label={t("sxWorkflowLibCondNot")}
                />
            </Field>
        </div>
    );
}

/* ── YAML ⇄ visual model ───────────────────────────────────────────────── */
// Stable per-item id used as the diagram node key, so inserting/reordering never
// shifts positions onto another node. Stripped from the saved YAML.
let _seq = 0;
export const uid = () => `wf-${_seq++}-${Math.random().toString(36).slice(2, 8)}`;
const _normUses = (x: any) =>
    typeof x === "string"
        ? { _id: uid(), uses: x, with: {} }
        : { _id: x?._id || uid(), uses: x?.uses || "", with: x?.with || {} };
const cleanWith = (w: any) => {
    const out: any = {};
    Object.entries(w || {}).forEach(([k, v]) => {
        if (String(k).trim() !== "" && v !== "" && v !== undefined && v !== null)
            out[k] = v;
    });
    return out;
};

// Server workflow schema (verified, decompiled from KC 26.6.3):
//   on:          single event id (scalar)                   e.g.  on: user-created
//   conditions:  a BOOLEAN EXPRESSION string (stored as `if`) over condition
//                functions with positional args, combined with and/or/not/().
//                e.g.  conditions: "has-role('admin') and not is-member-of('x')"
//   steps:       list of { uses, with? }
const usesItem = (uses: string) => ({ _id: uid(), uses: uses || "", with: {} });

// Condition function args. VERIFIED at runtime (KC 26.6.3): args are resolved BY
// NAME (not id) and the expression parser does NOT strip quotes — quoted args
// silently never match. `has-role` → realm role name (or `clientId/role` for a
// client role); `is-member-of` → group name or path; `has-user-attribute` → a
// SINGLE `name:value` arg (not two). See condCall() for the emitted format.
export const COND_FIELDS: Record<string, any[]> = {
    "has-role": [{ key: "role", label: "sxWorkflowLibFieldRole", placeholder: "sxWorkflowLibPhCondRole" }],
    "is-member-of": [
        { key: "group", label: "sxWorkflowLibFieldGroup", placeholder: "sxWorkflowLibPhCondGroup" }
    ],
    "has-identity-provider-link": [
        { key: "alias", label: "sxWorkflowLibFieldIdp", placeholder: "sxWorkflowLibPhIdp" }
    ],
    "has-user-attribute": [
        { key: "name", label: "sxWorkflowLibFieldAttribute", placeholder: "sxWorkflowLibPhCondAttribute" },
        { key: "value", label: "sxWorkflowLibFieldValue", placeholder: "sxWorkflowLibPhCondValue" }
    ]
};

// One condition function call. Args UNQUOTED and BY NAME; has-user-attribute is a
// single `name:value` token. (Quoting or using ids → the condition never fires.)
function condCall(c: any) {
    if (c.uses === "has-user-attribute") {
        const name = String(c.args?.name ?? "").trim();
        const value = String(c.args?.value ?? "").trim();
        return `has-user-attribute(${name}:${value})`;
    }
    const f = (COND_FIELDS[c.uses] || [])[0];
    const v = String(c.args?.[f?.key] ?? "").trim();
    return `${c.uses}(${v})`;
}

// Build the `conditions` boolean expression string from the visual model.
export function condExpr(m: any) {
    const parts = (m.conditions || [])
        .filter((c: any) => c.uses)
        .map((c: any) => `${c.not ? "not " : ""}${condCall(c)}`);
    return parts.join(` ${m.condOp === "or" ? "or" : "and"} `);
}

// Parse a flat boolean expression back into the visual model (no nesting; complex
// grouped expressions round-trip via YAML mode instead).
export function parseConditions(expr: any): { conditions: any[]; condOp: string } {
    if (!expr || typeof expr !== "string") return { conditions: [], condOp: "and" };
    const hasOr = /\bor\b/i.test(expr);
    const hasAnd = /\band\b/i.test(expr);
    const condOp = hasOr && !hasAnd ? "or" : "and";
    const tokens = expr
        .split(condOp === "or" ? /\s+or\s+/i : /\s+and\s+/i)
        .map((t: string) => t.trim())
        .filter(Boolean);
    const conditions = tokens.map((tok: string) => {
        let not = false;
        let t = tok;
        const nm = /^not\s+(.*)$/i.exec(t);
        if (nm) {
            not = true;
            t = nm[1].trim();
        }
        const fm = /^([a-z][a-z-]*)\s*\((.*)\)$/i.exec(t);
        if (!fm) return { _id: uid(), uses: "", args: {}, not };
        const uses = fm[1];
        const inner = fm[2].trim();
        const unq = (s: string) => s.trim().replace(/^['"]|['"]$/g, ""); // tolerate legacy quoted values
        const args: any = {};
        if (uses === "has-user-attribute") {
            const mm = /^(.*?)[:=](.*)$/.exec(inner); // name:value (or legacy name,value)
            const mc = mm ? null : /^(.*?),(.*)$/.exec(inner);
            args.name = unq(mm ? mm[1] : mc ? mc[1] : inner);
            args.value = unq(mm ? mm[2] : mc ? mc[2] : "");
        } else {
            const f = (COND_FIELDS[uses] || [])[0];
            if (f) args[f.key] = unq(inner);
        }
        return { _id: uid(), uses, args, not };
    });
    return { conditions, condOp };
}

export function fromYaml(text: string) {
    let o: any = {};
    try {
        o = yaml.parse(text) || {};
    } catch {
        o = {};
    }
    const idList = (v: any) =>
        (Array.isArray(v) ? v : v != null ? [v] : []).map((x: any) =>
            usesItem(typeof x === "string" ? x : x?.uses || "")
        );
    const steps = (Array.isArray(o.steps) ? o.steps : o.steps ? [o.steps] : []).map(
        (s: any) =>
            typeof s === "string"
                ? { _id: uid(), uses: s, with: {}, after: "" }
                : {
                      _id: s?._id || uid(),
                      uses: s?.uses || "",
                      with: s?.with || {},
                      after: s?.after || ""
                  }
    );
    const { conditions, condOp } = parseConditions(o.conditions ?? o.if);
    return {
        name: o.name || "",
        enabled: o.enabled !== false,
        on: idList(o.on),
        conditions,
        condOp,
        steps
    };
}

export function toYaml(m: any) {
    const obj: any = { name: m.name || "", enabled: m.enabled !== false };
    const trigger = m.on?.find((o: any) => o.uses)?.uses;
    if (trigger) obj.on = trigger; // scalar string
    const ce = condExpr(m);
    if (ce) obj.conditions = ce; // boolean expression string
    obj.steps = (m.steps || [])
        .filter((s: any) => s.uses)
        .map((s: any) => {
            const w = cleanWith(s.with);
            const out: any = { uses: s.uses };
            if (s.after && String(s.after).trim()) out.after = String(s.after).trim(); // per-step delay (sibling of `with`)
            if (Object.keys(w).length) out.with = w;
            return out;
        });
    return yaml.stringify(obj);
}

// Identity of a step (action + its config) — two steps that match are pure dupes.
const stepKey = (s: any) => `${s.uses}|${JSON.stringify(cleanWith(s.with))}`;
export function isDupStep(steps: any[], idx: number) {
    const s = steps[idx];
    if (!s?.uses) return false;
    const k = stepKey(s);
    for (let i = 0; i < idx; i++)
        if (steps[i]?.uses && stepKey(steps[i]) === k) return true;
    return false;
}
// Server rule (KC 26.6): `restart` re-runs the schedule, so it's only valid when
// an EARLIER step is scheduled (has `after`). restart at position 0, or with only
// its own `after`, → HTTP 400 "No scheduled step found if restarting at position 0".
export function restartNeedsSchedule(steps: any[], idx: number) {
    if (steps[idx]?.uses !== "restart") return false;
    return !steps.slice(0, idx).some((p: any) => p?.uses && String(p.after || "").trim());
}
const condKey = (c: any) => `${c.uses}|${JSON.stringify(c.args || {})}|${c.not ? 1 : 0}`;
export function isDupCond(conds: any[], idx: number) {
    const c = conds[idx];
    if (!c?.uses) return false;
    const k = condKey(c);
    for (let i = 0; i < idx; i++)
        if (conds[i]?.uses && condKey(conds[i]) === k) return true;
    return false;
}

/** Pre-submit validation — returns located errors so nothing invalid is sent. */
export function validateModel(m: any) {
    const e: any[] = [];
    if (!m.name || !String(m.name).trim())
        e.push({ where: "sxWorkflowLibWhereGeneral", msg: "sxWorkflowLibErrNameRequired" });
    if (m.on.filter((x: any) => x.uses).length > 1)
        e.push({ where: "sxWorkflowLibTrigger", msg: "sxWorkflowLibErrSingleEvent" });
    // Empty (just-added, not yet chosen) items are ignored — they're dropped on
    // save, not flagged as errors.
    if (!m.steps.some((s: any) => s.uses))
        e.push({ where: "sxWorkflowLibSteps", msg: "sxWorkflowLibErrNoSteps" });
    const resource = workflowResource(m);
    m.steps.forEach((s: any, i: number) => {
        if (!s.uses) return;
        const where = "sxWorkflowLibStepN";
        const whereParams = { n: i + 1 };
        if (!stepAllowed(s.uses, resource))
            e.push({
                where,
                whereParams,
                msg:
                    resource === "clients"
                        ? "sxWorkflowLibErrStepIncompatibleClient"
                        : "sxWorkflowLibErrStepIncompatibleUser",
                stepId: s.uses
            });
        else if (isDupStep(m.steps, i))
            e.push({ where, whereParams, msg: "sxWorkflowLibErrDuplicateStep", stepId: s.uses });
        else if (restartNeedsSchedule(m.steps, i))
            e.push({ where, whereParams, msg: "sxWorkflowLibErrRestartNeedsDelay" });
    });
    m.conditions.forEach((c: any, i: number) => {
        if (!c.uses) return;
        const where = "sxWorkflowLibConditionN";
        const whereParams = { n: i + 1 };
        if (!condAllowed(resource))
            e.push({ where, whereParams, msg: "sxWorkflowLibErrCondClientFlow" });
        else if (isDupCond(m.conditions, i))
            e.push({ where, whereParams, msg: "sxWorkflowLibErrDuplicateCond", condId: c.uses });
    });
    return e;
}

export const STARTER = toYaml({
    name: "yeni-workflow",
    enabled: true,
    on: [{ uses: "user-created", with: {} }],
    conditions: [],
    steps: [{ uses: "notify-user", with: {} }]
});

export function stripIds(w: any) {
    const c = JSON.parse(JSON.stringify(w || {}));
    delete c.id;
    (c.steps || []).forEach?.((s: any) => delete s.id);
    (c.on || []).forEach?.((s: any) => delete s.id);
    (c.conditions || []).forEach?.((s: any) => delete s.id);
    return c;
}

/* ── raw REST ──────────────────────────────────────────────────────────── */
export const workflowsUrl = (adminClient: any, realm: string, id?: string) =>
    `${adminClient.baseUrl}/admin/realms/${encodeURIComponent(realm)}/workflows${id ? `/${encodeURIComponent(id)}` : ""}`;

export async function rawWorkflow(
    adminClient: any,
    realm: string,
    method: string,
    id?: string,
    body?: any
) {
    const token = await adminClient.getAccessToken();
    const isYaml = typeof body === "string";
    const fmt = isYaml ? "application/yaml" : "application/json";
    const res = await fetch(workflowsUrl(adminClient, realm, id), {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: fmt,
            ...(body !== undefined ? { "Content-Type": fmt } : {})
        },
        body: body !== undefined ? (isYaml ? body : JSON.stringify(body)) : undefined
    });
    if (res.status === 404 && method === "GET") return null;
    if (!res.ok) {
        let detail = "";
        try {
            detail = (await res.text())?.slice(0, 200) || "";
        } catch {}
        throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
    }
    const text = await res.text().catch(() => "");
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return yaml.parse(text); // YAML response
    }
}

/* Live provider palettes (events / steps / conditions). */
export function usePalette() {
    const { adminClient } = useAdminClient();
    const [palette, setPalette] = useState<any>({
        events: [],
        steps: [],
        conditions: []
    });
    useEffect(() => {
        adminClient.serverInfo
            .find()
            .then((info: any) => {
                const ids = (spi: string) =>
                    Object.keys(info?.providers?.[spi]?.providers || {});
                setPalette({
                    events: ids("workflow-event"),
                    steps: ids("workflow-step"),
                    conditions: ids("workflow-condition")
                });
            })
            .catch(() => {});
    }, [adminClient]);
    return palette;
}

/* ── Diagram view (reactflow) ──────────────────────────────────────────── */
const NODE_W = 264;
const NODE_ICON: Record<string, any> = {
    trigger: LightningIcon,
    condition: FunnelIcon,
    step: FlowArrowIcon
};

function WfNode({ data }: any) {
    const t = useT();
    // Invisible anchors (no visible dot): "branch" is the fork point conditions
    // fan out from (just below the trigger); "merge" is where they converge
    // (just above the steps); "end" is the trailing terminal. They only exist so
    // edges have something to attach to.
    // branch/merge/end are invisible 1px anchors at the column center. The "+" is
    // rendered ON the trunk edges (same AddMenuButton as the step edges), so the
    // design/click is identical to steps; the only extra is the fork itself.
    if (data.kind === "branch" || data.kind === "merge" || data.kind === "end") {
        return (
            <div style={{ width: 1, height: 1 }}>
                <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
                <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
            </div>
        );
    }
    const Icon = NODE_ICON[data.kind] || FlowArrowIcon;
    const text = (v: any) =>
        v == null
            ? ""
            : typeof v === "string"
              ? v
              : v.map
                ? labelOf(t, LABEL_MAPS[v.map], v.id)
                : t(v.key, v.params);
    const summary =
        data.events !== undefined
            ? data.events.length
                ? data.events.map((id: string) => labelOf(t, EVENT_LABELS, id)).join(", ")
                : t("sxWorkflowLibPickEvent")
            : data.summary;
    return (
        <Card
            size="sm"
            onClick={data.onSelect}
            style={{ width: NODE_W }}
            data-selected={data.selected ? "" : undefined}
            className={cn(
                "group relative cursor-pointer gap-1.5",
                data.selected
                    ? "ring-2 ring-primary"
                    : data.invalid && "ring-2 ring-destructive"
            )}
        >
            <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
            <CardHeader>
                <CardDescription className="text-xs uppercase">
                    {text(data.eyebrow)}
                </CardDescription>
                <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon weight="bold" className="shrink-0" />
                    <span className="truncate">{text(data.title)}</span>
                </CardTitle>
                <CardAction>
                    <CaretRightIcon className="size-4 text-muted-foreground" />
                </CardAction>
            </CardHeader>
            {summary && (
                <CardContent>
                    <p className="truncate text-xs text-muted-foreground">
                        {summary}
                    </p>
                </CardContent>
            )}
            <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
        </Card>
    );
}

/* Menu "+" — opens an Adım/Koşul picker (DropdownMenu portals it so it isn't clipped). */
function AddMenuButton({ canStep, canCond, onStep, onCond }: any) {
    const t = useT();
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon-xs"
                    title={t("sxWorkflowLibAdd")}
                    aria-label={t("sxWorkflowLibAdd")}
                    onClick={(e: any) => e.stopPropagation()}
                >
                    <PlusIcon weight="bold" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={6} className="min-w-40">
                {canStep && (
                    <DropdownMenuItem onClick={() => onStep?.()}>
                        <FlowArrowIcon /> {t("sxWorkflowLibStep")}
                    </DropdownMenuItem>
                )}
                {canCond && (
                    <DropdownMenuItem onClick={() => onCond?.()}>
                        <FunnelIcon /> {t("sxWorkflowLibCondition")}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/* Plain dashed "+" — direct step add (between/after steps). */
function _AddButton({ onAdd, title }: any) {
    const t = useT();
    const label = title ?? t("sxWorkflowLibAdd");
    return (
        <Button
            variant="outline"
            size="icon-xs"
            onClick={(e: any) => {
                e.stopPropagation();
                onAdd?.();
            }}
            title={label}
            aria-label={label}
        >
            <PlusIcon weight="bold" />
        </Button>
    );
}

/* Edge with the Adım/Koşul "+" menu sitting ON the line at its midpoint. */
function AddEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    data
}: any) {
    const [path, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 14
    });
    return (
        <>
            <BaseEdge id={id} path={path} style={style} />
            {data && (data.canStep || data.canCond) && (
                <EdgeLabelRenderer>
                    <div
                        className="nodrag nopan"
                        style={{
                            position: "absolute",
                            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: "all"
                        }}
                    >
                        <AddMenuButton
                            canStep={data.canStep}
                            canCond={data.canCond}
                            onStep={data.onStep}
                            onCond={data.onCond}
                        />
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}

const EDGE_STYLE = { stroke: "rgb(125 125 135 / 0.45)", strokeWidth: 1.5 };

// Auto-layout: trigger on top → a shared branch point just below it → conditions
// fan out horizontally from that point (parallel set) and converge → steps chain
// vertically → end anchor. The trigger→branch edge carries the one shared "+"
// (adds a condition or the first step); step edges carry per-edge step "+".
const ROW_GAP = 124;
function computeSlots(model: any) {
    const slots: Record<string, any> = { trigger: { x: 0, y: 0 } };
    const conds = model.conditions || [];
    const steps = model.steps || [];
    const center = NODE_W / 2;
    let stepBaseY: number;
    if (conds.length) {
        // Shared trunk → fork → converge → shared trunk. branch/merge sit on the
        // center column so the trunk lines (which carry the +) stay vertical.
        slots.__branch = { x: center, y: 160 };
        const gap = 48;
        const rowW = conds.length * NODE_W + (conds.length - 1) * gap;
        const startX = center - rowW / 2;
        conds.forEach((c: any, i: number) => {
            slots[c._id] = { x: startX + i * (NODE_W + gap), y: 290 };
        });
        slots.__merge = { x: center, y: 450 };
        stepBaseY = 540;
    } else {
        stepBaseY = 160;
    }
    steps.forEach((s: any, k: number) => {
        slots[s._id] = { x: 0, y: stepBaseY + k * ROW_GAP };
    });
    slots.__end = {
        x: center,
        y: steps.length ? stepBaseY + steps.length * ROW_GAP : stepBaseY
    };
    return slots;
}

/* Flow order as descriptors with STABLE ids. branch/merge are the shared fork
   trunk points (only when conditions exist); __end is the terminal anchor. */
function descriptors(model: any) {
    const d = [{ id: "trigger", kind: "trigger", idx: -1 }];
    if (model.conditions.length) d.push({ id: "__branch", kind: "branch", idx: -1 });
    model.conditions.forEach((c: any, i: number) =>
        d.push({ id: c._id, kind: "condition", idx: i })
    );
    if (model.conditions.length) d.push({ id: "__merge", kind: "merge", idx: -1 });
    model.steps.forEach((s: any, i: number) =>
        d.push({ id: s._id, kind: "step", idx: i })
    );
    d.push({ id: "__end", kind: "end", idx: -1 });
    return d;
}

/* Resolve a selected node id back to its list + index. */
function findNode(model: any, id: string) {
    if (id === "trigger") return { kind: "trigger", idx: -1 };
    let idx = model.steps.findIndex((s: any) => s._id === id);
    if (idx >= 0) return { kind: "step", idx };
    idx = model.conditions.findIndex((c: any) => c._id === id);
    if (idx >= 0) return { kind: "condition", idx };
    return null;
}

function dataFor(desc: any, model: any) {
    if (desc.kind === "end" || desc.kind === "branch" || desc.kind === "merge")
        return { kind: desc.kind };
    if (desc.kind === "trigger")
        return {
            kind: "trigger",
            accent: "orange",
            eyebrow: { key: "sxWorkflowLibWhen" },
            title: { key: "sxWorkflowLibTrigger" },
            events: model.on.filter((o: any) => o.uses).map((o: any) => o.uses)
        };
    if (desc.kind === "condition") {
        const c = model.conditions[desc.idx] || {};
        const cf = COND_FIELDS[c.uses]?.[0];
        return {
            kind: "condition",
            accent: "purple",
            eyebrow: { key: c.not ? "sxWorkflowLibConditionNegated" : "sxWorkflowLibCondition" },
            title: c.uses ? { map: "cond", id: c.uses } : { key: "sxWorkflowLibPickCondition" },
            summary: cf && c.args?.[cf.key] ? String(c.args[cf.key]) : "",
            invalid: c.uses
                ? !condAllowed(workflowResource(model)) ||
                  isDupCond(model.conditions, desc.idx)
                : false
        };
    }
    const s = model.steps[desc.idx] || {};
    return {
        kind: "step",
        accent: "blue",
        eyebrow: { key: "sxWorkflowLibStepN", params: { n: desc.idx + 1 } },
            title: s.uses ? { map: "step", id: s.uses } : { key: "sxWorkflowLibPickAction" },
        summary: [s.after && `⏱ ${s.after}`, stepSummary(s.uses, s.with)]
            .filter(Boolean)
            .join(" · "),
        invalid: s.uses
            ? !stepAllowed(s.uses, workflowResource(model)) ||
              isDupStep(model.steps, desc.idx) ||
              restartNeedsSchedule(model.steps, desc.idx)
            : false
    };
}

function WorkflowDiagram({ model, onChange, palette }: any) {
    const t = useT();
    const [selected, setSelected] = useState("trigger");
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const nodeTypes = useMemo(() => ({ wf: WfNode }), []);
    const edgeTypes = useMemo(() => ({ add: AddEdge }), []);
    const rf = useRef<any>(null);
    const focusRef = useRef<string | null>(null);
    const pinned = useRef<Set<string>>(new Set()); // ids the user dragged → keep their position
    const handleNodesChange = (changes: any[]) => {
        for (const ch of changes)
            if (ch.type === "position" && ch.dragging) pinned.current.add(ch.id);
        onNodesChange(changes);
    };

    const insertStep = (at: number) => {
        const item = { _id: uid(), uses: "", with: {}, after: "" }; // empty → user picks the action
        const steps = model.steps.slice();
        steps.splice(at, 0, item);
        focusRef.current = item._id;
        onChange({ ...model, steps });
        setSelected(item._id);
    };
    const addCondAt = (at: number) => {
        const item = { _id: uid(), uses: "", with: {} }; // empty → user picks the condition
        const conditions = model.conditions.slice();
        conditions.splice(at, 0, item);
        focusRef.current = item._id;
        onChange({ ...model, conditions });
        setSelected(item._id);
    };

    // Bring a just-added node into view (keeps current zoom; smooth pan).
    useEffect(() => {
        if (!rf.current || !focusRef.current) return;
        const n = nodes.find((x: any) => x.id === focusRef.current);
        if (!n) return;
        const { zoom } = rf.current.getViewport();
        rf.current.setCenter(n.position.x + NODE_W / 2, n.position.y + 36, {
            zoom,
            duration: 450
        });
        focusRef.current = null;
    }, [nodes]);

    // Reconcile nodes from the model. Existing nodes keep the position the user
    // dragged them to (keyed by stable id); a brand-new node is dropped BELOW
    // everything so it never lands on top of another node.
    useEffect(() => {
        setNodes(prev => {
            const pos: Record<string, any> = {};
            prev.forEach(n => (pos[n.id] = n.position));
            const slots = computeSlots(model);
            return descriptors(model).map(desc => {
                const data: any = {
                    ...dataFor(desc, model),
                    onSelect: () => setSelected(desc.id),
                    selected: selected === desc.id
                };
                if (
                    desc.kind === "end" ||
                    desc.kind === "branch" ||
                    desc.kind === "merge"
                ) {
                    // Layout anchors — fixed, never draggable or selectable.
                    return {
                        id: desc.id,
                        type: "wf",
                        draggable: false,
                        selectable: false,
                        position: slots[desc.id],
                        data
                    };
                }
                // Auto-layout slot, unless the user pinned (dragged) this node.
                const slot = (pinned.current.has(desc.id)
                    ? pos[desc.id]
                    : slots[desc.id]) ||
                    slots[desc.id] ||
                    pos[desc.id] || { x: 0, y: 0 };
                return { id: desc.id, type: "wf", draggable: true, position: slot, data };
            });
        });
    }, [model, selected, setNodes]);

    const edges = useMemo(() => {
        const resource = workflowResource(model);
        const condOk = condAllowed(resource);
        const conds = model.conditions;
        const steps = model.steps;
        const firstStepId = steps[0]?._id;
        const out: any[] = [];
        let i = 0;
        const plain = (source: string, target: string) =>
            out.push({
                id: `e${i++}`,
                source,
                target,
                type: "add",
                style: EDGE_STYLE,
                data: {}
            });
        const plus = (source: string, target: string, data: any) =>
            out.push({
                id: `e${i++}`,
                source,
                target,
                type: "add",
                style: EDGE_STYLE,
                data
            });

        if (conds.length) {
            // Shared trunk above the fork carries the Koşul "+", shared trunk below
            // the merge carries the Adım "+" — same edge "+" as the steps. The fan
            // (branch→cond) and converge (cond→merge) lines are plain.
            plus("trigger", "__branch", {
                canStep: false,
                canCond: condOk,
                onCond: () => addCondAt(conds.length)
            });
            conds.forEach((c: any) => {
                plain("__branch", c._id);
                plain(c._id, "__merge");
            });
            plus("__merge", firstStepId || "__end", {
                canStep: true,
                canCond: false,
                onStep: () => insertStep(0)
            });
        } else {
            // No conditions yet: a single start "+" offers both (first condition or first step).
            plus("trigger", firstStepId || "__end", {
                canStep: true,
                canCond: condOk,
                onStep: () => insertStep(0),
                onCond: () => addCondAt(0)
            });
        }

        // Steps are a sequential chain; each gap + the trailing edge carries a step "+".
        steps.forEach((s: any, k: number) => {
            if (k > 0)
                plus(steps[k - 1]._id, s._id, {
                    canStep: true,
                    canCond: false,
                    onStep: () => insertStep(k)
                });
        });
        if (steps.length)
            plus(steps[steps.length - 1]._id, "__end", {
                canStep: true,
                canCond: false,
                onStep: () => insertStep(steps.length)
            });

        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [model, insertStep, addCondAt]);

    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
                <Trans
                    t={t}
                    i18nKey="sxWorkflowLibDiagramHint"
                    components={{ plus: <span className="font-medium text-primary" /> }}
                />
            </p>
            <div style={{ height: 480 }} className={cn(GROUP, "relative")}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={handleNodesChange}
                    onInit={(inst: any) => (rf.current = inst)}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.3, maxZoom: 0.9 }}
                    minZoom={0.4}
                    nodesConnectable={false}
                    zoomOnScroll={false}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background gap={20} size={1.5} color="rgb(130 130 140 / 0.2)" />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </div>
            <NodePanel
                selected={selected}
                model={model}
                onChange={onChange}
                palette={palette}
                onSelect={setSelected}
            />
        </div>
    );
}

/* Single-event trigger picker (toggle chips). */
function EventChips({ model, palette, onPick }: any) {
    const t = useT();
    return (
        <div className="flex flex-wrap gap-1.5">
            {(palette.events.length ? palette.events : Object.keys(EVENT_LABELS)).map(
                (id: string) => {
                    const on = model.on.some((x: any) => x.uses === id);
                    return (
                        <Button
                            key={id}
                            size="sm"
                            variant={on ? "default" : "secondary"}
                            aria-pressed={on}
                            onClick={() => onPick(on ? [] : [{ _id: uid(), uses: id }])}
                        >
                            {labelOf(t, EVENT_LABELS, id)}
                        </Button>
                    );
                }
            )}
        </div>
    );
}

function HintCard({ children }: any) {
    return (
        <Card size="sm" className={PANEL}>
            <CardContent>
                <p className="text-sm text-muted-foreground">{children}</p>
            </CardContent>
        </Card>
    );
}

function NodePanel({ selected, model, onChange, palette, onSelect }: any) {
    const t = useT();
    if (selected === "trigger") {
        return (
            <Card size="sm" className={PANEL}>
                <CardHeader>
                    <CardTitle className="text-sm">
                        {t("sxWorkflowLibTriggerPanelTitle")}
                    </CardTitle>
                    <CardDescription>{t("sxWorkflowLibTriggerPanelHint")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <EventChips
                        model={model}
                        palette={palette}
                        onPick={(on: any) => onChange({ ...model, on })}
                    />
                </CardContent>
            </Card>
        );
    }
    const node = findNode(model, selected);
    if (!node || node.kind === "trigger")
        return <HintCard>{t("sxWorkflowLibSelectNodeToEdit")}</HintCard>;
    const isStep = node.kind === "step";
    const idx = node.idx;
    const listKey = isStep ? "steps" : "conditions";
    const list = model[listKey];
    const it = list[idx];
    if (!it) return <HintCard>{t("sxWorkflowLibSelectNode")}</HintCard>;
    const opts = isStep
        ? allowedSteps(palette, workflowResource(model))
        : allowedConds(palette, workflowResource(model));
    const labels = isStep ? STEP_LABELS : COND_LABELS;
    const setIt = (next: any) =>
        onChange({
            ...model,
            [listKey]: list.map((x: any, i: number) => (i === idx ? next : x))
        });
    const del = () => {
        onChange({ ...model, [listKey]: list.filter((_: any, i: number) => i !== idx) });
        onSelect("trigger");
    };
    const move = (d: number) => {
        const j = idx + d;
        if (j < 0 || j >= list.length) return;
        const next = list.slice();
        [next[idx], next[j]] = [next[j], next[idx]];
        onChange({ ...model, [listKey]: next });
        // selection follows the item by its stable id automatically
    };
    return (
        <div className="flex flex-col gap-3">
            {!isStep && model.conditions.length >= 2 && (
                <Card size="sm" className={PANEL}>
                    <CardHeader>
                        <CardTitle className="text-sm">{t("sxWorkflowLibCondCombine")}</CardTitle>
                        <CardDescription>
                            {model.condOp === "or"
                                ? t("sxWorkflowLibCondAny")
                                : t("sxWorkflowLibCondAll")}
                        </CardDescription>
                        <CardAction>
                            <SegmentPicker
                                size="sm"
                                value={model.condOp === "or" ? "or" : "and"}
                                onValueChange={(v: string) =>
                                    onChange({ ...model, condOp: v })
                                }
                                aria-label={t("sxWorkflowLibCondCombine")}
                            >
                                <SegmentPickerItem value="and" label={t("sxWorkflowLibAnd")} />
                                <SegmentPickerItem value="or" label={t("sxWorkflowLibOr")} />
                            </SegmentPicker>
                        </CardAction>
                    </CardHeader>
                </Card>
            )}
            <Card size="sm" className={PANEL}>
                <CardHeader>
                    <CardTitle className="text-sm">
                        {isStep
                            ? t("sxWorkflowLibStepN", { n: idx + 1 })
                            : t("sxWorkflowLibCondition")}
                    </CardTitle>
                    <CardAction className="flex items-center gap-1">
                        {isStep && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={t("sxWorkflowLibMoveUp")}
                                    onClick={() => move(-1)}
                                    disabled={idx === 0}
                                >
                                    <CaretUpIcon />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={t("sxWorkflowLibMoveDown")}
                                    onClick={() => move(1)}
                                    disabled={idx === list.length - 1}
                                >
                                    <CaretDownIcon />
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t("sxWorkflowLibDelete")}
                            onClick={del}
                        >
                            <TrashIcon />
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <Select
                        value={it.uses || "__none__"}
                        onValueChange={(v: string) =>
                            setIt(
                                isStep
                                    ? { ...it, uses: v === "__none__" ? "" : v }
                                    : { ...it, uses: v === "__none__" ? "" : v, args: {} }
                            )
                        }
                    >
                        <SelectTrigger size="sm" className="w-full">
                            <SelectValue placeholder={t("sxWorkflowLibSelectPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            {opts.map((id: string) => (
                                <SelectItem key={id} value={id}>
                                    {labelOf(t, labels, id)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {isStep ? (
                        <StepConfig
                            key={selected}
                            uses={it.uses}
                            value={it.with}
                            onChange={(w: any) => setIt({ ...it, with: w })}
                            after={it.after}
                            onAfter={(a: any) => setIt({ ...it, after: a })}
                        />
                    ) : (
                        <CondConfig it={it} onChange={setIt} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

/* Name + enabled rows shared by the diagram and form views. */
function GeneralGroup({ model, patch }: any) {
    const t = useT();
    return (
        <ul className={GROUP}>
            <li className="flex min-h-13 items-center gap-3 px-4 py-2">
                <span className="shrink-0 text-[15px]">{t("sxWorkflowLibName")}</span>
                <div className="min-w-0 flex-1">
                    <Input
                        size="md"
                        value={model.name}
                        onChange={(e: any) => patch({ name: e.target.value })}
                        placeholder={t("sxWorkflowLibNamePlaceholder")}
                        aria-label={t("sxWorkflowLibName")}
                        className="text-end"
                    />
                </div>
            </li>
            <li aria-hidden className={SEPARATOR} />
            <li className="flex min-h-13 items-center justify-between gap-3 px-4 py-2">
                <span className="text-[15px]">{t("sxWorkflowLibEnabled")}</span>
                <Switch
                    checked={!!model.enabled}
                    onCheckedChange={(v: boolean) => patch({ enabled: v })}
                    aria-label={t("sxWorkflowLibEnabled")}
                />
            </li>
        </ul>
    );
}

/* ── Editor (Diagram + Form + YAML) ────────────────────────────────────── */
export function WorkflowEditor({ draft, setDraft, palette, onErrors }: any) {
    const t = useT();
    const [view, setView] = useState("diagram");
    const [model, setModel] = useState(() => fromYaml(draft));

    const update = (next: any) => {
        setModel(next);
        setDraft(toYaml(next));
    };
    const patch = (p: any) => update({ ...model, ...p });
    const switchView = (v: string) => {
        if (v !== "yaml") setModel(fromYaml(draft)); // re-parse any manual YAML edits
        setView(v);
    };

    // Surface validation errors to the page so an invalid workflow can't be saved.
    useEffect(() => {
        let errs: any[];
        if (view === "yaml") {
            try {
                yaml.parse(draft);
                errs = validateModel(fromYaml(draft));
            } catch (e: any) {
                errs = [
                    {
                        where: "sxWorkflowLibWhereYaml",
                        msg: "sxWorkflowLibErrYamlParse",
                        msgParams: { error: e?.message || String(e) }
                    }
                ];
            }
        } else {
            errs = validateModel(model);
        }
        onErrors?.(errs);
    }, [model, draft, view, onErrors]);

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    {t("sxWorkflowLibViewsHint")}
                </p>
                <SegmentTabs
                    value={view}
                    onChange={switchView}
                    ariaLabel={t("sxWorkflowLibView")}
                    items={[
                        { value: "diagram", label: t("sxWorkflowLibViewDiagram") },
                        { value: "visual", label: t("sxWorkflowLibViewVisual") },
                        { value: "yaml", label: t("sxWorkflowLibViewYaml") }
                    ]}
                />
            </div>

            {view === "yaml" ? (
                <Textarea
                    value={draft}
                    onChange={(e: any) => setDraft(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    resizable="inside"
                    className="min-h-120 font-mono text-sm"
                    aria-label={t("sxWorkflowLibViewYaml")}
                />
            ) : view === "diagram" ? (
                <div className="flex flex-col gap-4">
                    <GeneralGroup model={model} patch={patch} />
                    <WorkflowDiagram model={model} onChange={update} palette={palette} />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <GeneralGroup model={model} patch={patch} />

                    <FlowSection
                        icon={<LightningIcon />}
                        title={t("sxWorkflowLibTrigger")}
                        subtitle={t("sxWorkflowLibTriggerSubtitle")}
                    >
                        <EventChips
                            model={model}
                            palette={palette}
                            onPick={(on: any) => patch({ on })}
                        />
                    </FlowSection>

                    <Connector />

                    <FlowSection
                        icon={<FunnelIcon />}
                        title={t("sxWorkflowLibConditions")}
                        subtitle={t("sxWorkflowLibConditionsSubtitle")}
                    >
                        <UsesList
                            items={model.conditions}
                            palette={palette.conditions}
                            labels={COND_LABELS}
                            emptyText={t("sxWorkflowLibConditionsEmpty")}
                            addText={t("sxWorkflowLibAddCondition")}
                            noConfig
                            onChange={(conditions: any) => patch({ conditions })}
                        />
                    </FlowSection>

                    <Connector />

                    <FlowSection
                        icon={<FlowArrowIcon />}
                        title={t("sxWorkflowLibSteps")}
                        subtitle={t("sxWorkflowLibStepsSubtitle")}
                    >
                        <UsesList
                            items={model.steps}
                            palette={allowedSteps(palette, workflowResource(model))}
                            labels={STEP_LABELS}
                            emptyText={t("sxWorkflowLibStepsEmpty")}
                            addText={t("sxWorkflowLibAddStep")}
                            ordered
                            onChange={(steps: any) => patch({ steps })}
                        />
                    </FlowSection>
                </div>
            )}
        </div>
    );
}

function FlowSection({ icon, title, subtitle, children }: any) {
    return (
        <Card size="sm" className={PANEL}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                    {icon}
                    {title}
                </CardTitle>
                <CardDescription>{subtitle}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function Connector() {
    return (
        <div className="flex justify-center text-muted-foreground">
            <ArrowDownIcon className="size-4" />
        </div>
    );
}

function UsesList({
    items,
    palette,
    labels,
    emptyText,
    addText,
    ordered,
    noConfig,
    onChange
}: any) {
    const t = useT();
    const opts = palette.length ? palette : Object.keys(labels);
    const setAt = (i: number, next: any) =>
        onChange(items.map((it: any, idx: number) => (idx === i ? next : it)));
    const removeAt = (i: number) =>
        onChange(items.filter((_: any, idx: number) => idx !== i));
    const move = (i: number, d: number) => {
        const j = i + d;
        if (j < 0 || j >= items.length) return;
        const next = items.slice();
        [next[i], next[j]] = [next[j], next[i]];
        onChange(next);
    };
    const add = () =>
        onChange([...items, { _id: uid(), uses: opts[0] || "", with: {}, after: "" }]);

    return (
        <div className="flex flex-col items-start gap-2">
            {items.length === 0 && (
                <p className="px-1 text-sm text-muted-foreground">{emptyText}</p>
            )}
            {items.map((it: any, i: number) => (
                <Card key={it._id || i} size="sm" className={cn(PANEL_INNER, "w-full")}>
                    <CardContent className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            {ordered && <Badge variant="outline">{i + 1}</Badge>}
                            <Select
                                value={it.uses || "__none__"}
                                onValueChange={(v: string) =>
                                    setAt(i, { ...it, uses: v === "__none__" ? "" : v })
                                }
                            >
                                <SelectTrigger size="sm" className="flex-1">
                                    <SelectValue placeholder={t("sxWorkflowLibSelectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {opts.map((id: string) => (
                                        <SelectItem key={id} value={id}>
                                            {labelOf(t, labels, id)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {ordered && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => move(i, -1)}
                                        disabled={i === 0}
                                        aria-label={t("sxWorkflowLibMoveUp")}
                                    >
                                        <CaretUpIcon />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => move(i, 1)}
                                        disabled={i === items.length - 1}
                                        aria-label={t("sxWorkflowLibMoveDown")}
                                    >
                                        <CaretDownIcon />
                                    </Button>
                                </>
                            )}
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => removeAt(i)}
                                aria-label={t("sxWorkflowLibDelete")}
                            >
                                <TrashIcon />
                            </Button>
                        </div>
                        {!noConfig && (
                            <StepConfig
                                uses={it.uses}
                                value={it.with}
                                onChange={(w: any) => setAt(i, { ...it, with: w })}
                                after={it.after}
                                onAfter={(a: any) => setAt(i, { ...it, after: a })}
                            />
                        )}
                    </CardContent>
                </Card>
            ))}
            <Button variant="plain" size="sm" onClick={add}>
                <PlusIcon /> {addText}
            </Button>
        </div>
    );
}

function WithEditor({ value, onChange }: any) {
    const t = useT();
    // Local rows keep in-progress (empty-key) entries alive while typing; only
    // entries with a non-empty key are committed up to the model.
    const [rows, setRows] = useState<any[]>(() =>
        Object.entries(value || {}).map(([k, v]) => [k, String(v ?? "")])
    );
    const commit = (next: any[]) => {
        setRows(next);
        const obj: any = {};
        next.forEach(([k, v]: any) => {
            if (String(k).trim() !== "") obj[k] = v;
        });
        onChange(obj);
    };
    return (
        <div className="mt-2 flex flex-col items-start gap-1.5">
            {rows.map(([k, v]: any, i: number) => (
                <div key={i} className="flex w-full items-center gap-2">
                    <Input
                        size="sm"
                        value={k}
                        onChange={(e: any) =>
                            commit(
                                rows.map((r, idx) =>
                                    idx === i ? [e.target.value, r[1]] : r
                                )
                            )
                        }
                        placeholder={t("sxWorkflowLibKey")}
                        aria-label={t("sxWorkflowLibKey")}
                        className="w-1/3"
                    />
                    <Input
                        size="sm"
                        value={v}
                        onChange={(e: any) =>
                            commit(
                                rows.map((r, idx) =>
                                    idx === i ? [r[0], e.target.value] : r
                                )
                            )
                        }
                        placeholder={t("sxWorkflowLibValue")}
                        aria-label={t("sxWorkflowLibValue")}
                        className="flex-1"
                    />
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => commit(rows.filter((_, idx) => idx !== i))}
                        aria-label={t("sxWorkflowLibRemove")}
                    >
                        <TrashIcon />
                    </Button>
                </div>
            ))}
            <Button variant="plain" size="xs" onClick={() => setRows([...rows, ["", ""]])}>
                <PlusIcon /> {t("sxWorkflowLibParameter")}
            </Button>
        </div>
    );
}
