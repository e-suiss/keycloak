// @ts-nocheck

import { Button } from "@ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@ui/components/field";
import { Input } from "@ui/components/input";
import { Spinner } from "@ui/components/spinner";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { useState } from "react";
import { AlertVariant, useAlerts } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useT } from "../../ui/i18n";

const BATCH = 100;

async function listAll(fetchPage: (first: number) => Promise<any[]>) {
    const all: any[] = [];
    for (let first = 0; ; first += BATCH) {
        const page = (await fetchPage(first)) || [];
        all.push(...page);
        if (page.length < BATCH) return all;
    }
}

export function DuplicateGroupModal({ group, copyPermissions, onClose, onDone }: any) {
    const t = useT();
    const { adminClient } = useAdminClient();
    const { addAlert, addError } = useAlerts();
    const [name, setName] = useState(t("sxGroupsCopyOf", { name: group.name }));
    const [busy, setBusy] = useState(false);

    const copyInto = async (sourceId: string, targetId: string) => {
        const members = await listAll(first =>
            adminClient.groups.listMembers({ id: sourceId, first, max: BATCH, briefRepresentation: true })
        );
        for (const m of members) await adminClient.users.addToGroup({ id: m.id, groupId: targetId });

        if (copyPermissions) {
            const perm = await adminClient.groups.listPermissions({ id: sourceId }).catch(() => null);
            if (perm?.enabled) await adminClient.groups.updatePermission({ id: targetId }, { enabled: true });
        }

        const mapping = await adminClient.groups.listRoleMappings({ id: sourceId });
        const realmRoles = (mapping?.realmMappings || []).map((r: any) => ({ id: r.id, name: r.name }));
        if (realmRoles.length > 0)
            await adminClient.groups.addRealmRoleMappings({ id: targetId, roles: realmRoles });
        for (const c of Object.values(mapping?.clientMappings || {}) as any[]) {
            const roles = (c.mappings || []).map((r: any) => ({ id: r.id, name: r.name }));
            if (roles.length > 0)
                await adminClient.groups.addClientRoleMappings({ id: targetId, clientUniqueId: c.id, roles });
        }

        const children = await listAll(first =>
            adminClient.groups.listSubGroups({ parentId: sourceId, first, max: BATCH, briefRepresentation: false })
        );
        for (const child of children) {
            const created = await adminClient.groups.createChildGroup(
                { id: targetId },
                { name: child.name, description: child.description, attributes: child.attributes }
            );
            await copyInto(child.id, created.id);
        }
    };

    const submit = async () => {
        const n = name.trim();
        if (!n) return;
        setBusy(true);
        try {
            const source = (await adminClient.groups.findOne({ id: group.id })) ?? group;
            const rep = { name: n, description: source.description, attributes: source.attributes };
            const parentId = source.parentId ?? group.parentId;
            const created = parentId
                ? await adminClient.groups.createChildGroup({ id: parentId }, rep)
                : await adminClient.groups.create(rep);
            await copyInto(source.id, created.id);
            addAlert(t("sxGroupsDuplicated"), AlertVariant.success);
            onDone();
        } catch (e) {
            addError(t("sxGroupsDuplicateError"), e);
            setBusy(false);
        }
    };

    return (
        <Modal open onOpenChange={o => !o && !busy && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>{t("sxGroupsDuplicateTitle")}</ModalTitle>
                </ModalHeader>
                <ModalBody>
                    <Field size="lg">
                        <FieldLabel htmlFor="group-duplicate-name">
                            {t("sxGroupsNameLabel")} <span className="text-[#d70015] dark:text-[#ff453a]">*</span>
                        </FieldLabel>
                        <Input
                            id="group-duplicate-name"
                            size="lg"
                            autoFocus
                            value={name}
                            disabled={busy}
                            onChange={(e: any) => setName(e.target.value)}
                            onKeyDown={(e: any) => e.key === "Enter" && submit()}
                        />
                        <FieldDescription>{t("sxGroupsDuplicateHint")}</FieldDescription>
                    </Field>
                </ModalBody>
                <ModalFooter>
                    <Button disabled={busy || !name.trim()} onClick={submit}>
                        {busy && <Spinner data-icon="inline-start" />}
                        {busy ? t("sxGroupsDuplicating") : t("sxGroupsDuplicate")}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
