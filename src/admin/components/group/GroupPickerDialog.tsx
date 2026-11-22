/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/group/GroupPickerDialog.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import type {
    GroupQuery,
    SubGroupQuery
} from "@keycloak/keycloak-admin-client/lib/resources/groups";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList
} from "@ui/components/breadcrumb";
import { Button as UiButton } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Input } from "@ui/components/input";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemGroup,
    ItemSeparator
} from "@ui/components/item";
import {
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalTitle
} from "@ui/patterns/modal";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListEmptyState, useFetch } from "../../../shared/keycloak-ui-shared";
import { useAdminClient } from "../../admin-client";
import { useGroupResource } from "../../context/group-resource/GroupResourceContext";
import { GroupPath } from "./GroupPath";

export type GroupPickerDialogProps = {
    id?: string;
    type: "selectOne" | "selectMany";
    filterGroups?: GroupRepresentation[];
    text: { title: string; ok: string };
    canBrowse?: boolean;
    isMove?: boolean;
    onConfirm: (groups: GroupRepresentation[] | undefined) => void;
    onClose: () => void;
};

type SelectableGroup = GroupRepresentation & {
    checked?: boolean;
};

export const GroupPickerDialog = ({
    id,
    type,
    filterGroups,
    text,
    canBrowse = true,
    isMove = false,
    onClose,
    onConfirm
}: GroupPickerDialogProps) => {
    const { adminClient } = useAdminClient();
    const groupResource = useGroupResource();

    const { t } = useTranslation();
    const [selectedRows, setSelectedRows] = useState<SelectableGroup[]>([]);

    const [navigation, setNavigation] = useState<SelectableGroup[]>([]);
    const [groups, setGroups] = useState<SelectableGroup[]>([]);
    const [filter, setFilter] = useState("");
    const [joinedGroups, setJoinedGroups] = useState<GroupRepresentation[]>([]);
    const [groupId, setGroupId] = useState<string>();

    const [max, setMax] = useState(10);
    const [first, setFirst] = useState(0);

    const [count, setCount] = useState(0);

    const currentGroup = () => navigation[navigation.length - 1];

    useFetch(
        async () => {
            let group;
            let groups;
            let existingUserGroups;

            if (!groupId) {
                const args: GroupQuery = {
                    first,
                    max: max + 1
                };
                if (filter !== "") {
                    args.search = filter;
                }
                groups = await groupResource.find(args);
            } else {
                if (!navigation.map(({ id }) => id).includes(groupId)) {
                    group = await groupResource.findOne({ id: groupId });
                    if (!group) {
                        throw new Error(t("notFound"));
                    }
                }

                const args: SubGroupQuery = {
                    first,
                    max,
                    parentId: groupId
                };
                groups = await groupResource.listSubGroups(args);
            }

            if (id) {
                existingUserGroups = await adminClient.users.listGroups({
                    id
                });
            }

            return { group, groups, existingUserGroups };
        },
        async ({ group: selectedGroup, groups, existingUserGroups }) => {
            setJoinedGroups(existingUserGroups || []);
            if (selectedGroup) {
                setNavigation([...navigation, selectedGroup]);
                setCount(selectedGroup.subGroupCount!);
            }

            groups.forEach((group: SelectableGroup) => {
                group.checked = !!selectedRows.find(r => r.id === group.id);
            });
            setGroups(groups);
            if (filter !== "" || !groupId) {
                setCount(groups.length);
            }
        },
        [groupId, filter, first, max]
    );

    const isRowDisabled = (row?: GroupRepresentation) => {
        return [
            ...joinedGroups.map(item => item.id),
            ...(filterGroups || []).map(group => group.id)
        ].some(group => group === row?.id);
    };

    return (
        <Modal open onOpenChange={o => !o && onClose()}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>
                        {t(text.title, {
                            group1: filterGroups?.[0]?.name,
                            group2: navigation.length ? currentGroup().name : t("root")
                        })}
                    </ModalTitle>
                </ModalHeader>
                <ModalBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
                <Input
                    type="search"
                    name="search"
                    aria-label={t("searchForGroups")}
                    placeholder={t("searchForGroups")}
                    defaultValue={filter}
                    onKeyDown={event => {
                        if (event.key === "Enter") {
                            const search = (event.target as HTMLInputElement).value;
                            setFilter(search);
                            setFirst(0);
                            setMax(10);
                            setNavigation([]);
                            setGroupId(undefined);
                        }
                    }}
                    className="max-w-xs"
                />
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                        {count === 0
                            ? "0"
                            : `${first + 1} - ${first + Math.min(max, count)}`}
                    </span>
                    <UiButton
                        variant="outline"
                        size="icon"
                        aria-label={t("previous")}
                        disabled={first === 0}
                        onClick={() => setFirst(Math.max(0, first - max))}
                    >
                        <CaretLeftIcon />
                    </UiButton>
                    <UiButton
                        variant="outline"
                        size="icon"
                        aria-label={t("next")}
                        disabled={count <= max}
                        onClick={() => setFirst(first + max)}
                    >
                        <CaretRightIcon />
                    </UiButton>
                </div>
            </div>
            <Breadcrumb>
                <BreadcrumbList>
                    {navigation.length > 0 && (
                        <BreadcrumbItem key="home">
                            <UiButton
                                variant="link"
                                onClick={() => {
                                    setGroupId(undefined);
                                    setNavigation([]);
                                    setFirst(0);
                                    setMax(10);
                                }}
                            >
                                {t("groups")}
                            </UiButton>
                        </BreadcrumbItem>
                    )}
                    {navigation.map((group, i) => (
                        <BreadcrumbItem key={i}>
                            {navigation.length - 1 !== i && (
                                <UiButton
                                    variant="link"
                                    onClick={() => {
                                        setGroupId(group.id);
                                        setNavigation([...navigation].slice(0, i));
                                        setFirst(0);
                                        setMax(10);
                                    }}
                                >
                                    {group.name}
                                </UiButton>
                            )}
                            {navigation.length - 1 === i && group.name}
                        </BreadcrumbItem>
                    ))}
                </BreadcrumbList>
            </Breadcrumb>
            {groups.length > 0 && (
            <ItemGroup variant="inset" aria-label={t("groups")}>
                {filter === ""
                    ? groups.slice(0, max).map((group: SelectableGroup, i: number) => (
                          <Fragment key={group.id}>
                          {i > 0 && <ItemSeparator />}
                          <GroupRow
                              key={group.id}
                              group={group}
                              isRowDisabled={isRowDisabled}
                              onSelect={group => {
                                  setGroupId(group.id);
                                  setFirst(0);
                              }}
                              type={type}
                              isSearching={filter !== ""}
                              setIsSearching={boolean => setFilter(boolean ? "" : filter)}
                              selectedRows={selectedRows}
                              setSelectedRows={setSelectedRows}
                              canBrowse={canBrowse}
                          />
                          </Fragment>
                      ))
                    : groups
                          ?.flatMap(g => deepGroup([g]))
                          .map((g, i) => (
                              <Fragment key={g.id}>
                              {i > 0 && <ItemSeparator />}
                              <GroupRow
                                  group={g}
                                  isRowDisabled={isRowDisabled}
                                  onSelect={group => {
                                      setGroupId(group.id);
                                      setFilter("");
                                      setFirst(0);
                                  }}
                                  type={type}
                                  isSearching
                                  selectedRows={selectedRows}
                                  setSelectedRows={setSelectedRows}
                                  canBrowse={false}
                              />
                              </Fragment>
                          ))}
            </ItemGroup>
            )}
            {groups.length === 0 && filter === "" && (
                <ListEmptyState
                    hasIcon={false}
                    message={t("moveGroupEmpty")}
                    instructions={isMove ? t("moveGroupEmptyInstructions") : undefined}
                />
            )}
            {groups.length === 0 && filter !== "" && (
                <ListEmptyState
                    message={t("noSearchResults")}
                    instructions={t("noSearchResultsInstructions")}
                />
            )}
                </ModalBody>
                <ModalFooter>
                    <UiButton
                        data-testid={`${text.ok}-button`}
                        key="confirm"
                        form="group-form"
                        onClick={() => {
                            onConfirm(
                                type === "selectMany"
                                    ? selectedRows
                                    : navigation.length
                                      ? [currentGroup()]
                                      : undefined
                            );
                        }}
                        disabled={type === "selectMany" && selectedRows.length === 0}
                    >
                        {t(text.ok)}
                    </UiButton>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

function deepGroup(groups: GroupRepresentation[]) {
    const flattened: GroupRepresentation[] = [];
    for (const group of groups) {
        flattened.push(group);
        if (group.subGroups && group.subGroups.length > 0) {
            flattened.push(...deepGroup(group.subGroups));
        }
    }
    return flattened;
}

type GroupRowProps = {
    group: SelectableGroup;
    type: "selectOne" | "selectMany";
    isRowDisabled: (row?: GroupRepresentation) => boolean;
    isSearching: boolean;
    setIsSearching?: (value: boolean) => void;
    onSelect?: (group: GroupRepresentation) => void;
    selectedRows: SelectableGroup[];
    setSelectedRows: (groups: SelectableGroup[]) => void;
    canBrowse: boolean;
};

const GroupRow = ({
    group,
    type,
    isRowDisabled,
    isSearching,
    setIsSearching,
    onSelect,
    selectedRows,
    setSelectedRows,
    canBrowse
}: GroupRowProps) => {
    const { t } = useTranslation();

    return (
        <Item
            size="sm"
            role="listitem"
            aria-labelledby={group.name}
            id={group.id}
            data-testid={group.name}
            className={`join-group-dialog-row${
                isRowDisabled(group) ? "-m-disabled" : ""
            }`}
            onClick={e => {
                if (type === "selectOne") {
                    onSelect?.(group);
                } else if (
                    (e.target as HTMLInputElement).type !== "checkbox" &&
                    group.subGroupCount !== 0
                ) {
                    onSelect?.(group);
                    setIsSearching?.(false);
                }
            }}
        >
            {type === "selectMany" && (
                <Checkbox
                    className="kc-join-group-modal-check"
                    data-testid={`${group.name}-check`}
                    aria-label={group.name}
                    checked={group.checked}
                    disabled={isRowDisabled(group)}
                    onCheckedChange={checked => {
                        group.checked = checked === true;
                        let newSelectedRows: SelectableGroup[] = [];
                        if (!group.checked) {
                            newSelectedRows = selectedRows.filter(r => r.id !== group.id);
                        } else {
                            newSelectedRows = [...selectedRows, group];
                        }

                        setSelectedRows(newSelectedRows);
                    }}
                    aria-labelledby={`select-${group.name}`}
                />
            )}

            <ItemContent className="keycloak-groups-group-path">
                {isSearching ? (
                    <GroupPath id={`select-${group.name}`} group={group} />
                ) : (
                    <span id={`select-${group.name}`}>{group.name}</span>
                )}
            </ItemContent>
            <ItemActions>
                {(canBrowse || type === "selectOne") && group.subGroupCount !== 0 && (
                    <UiButton variant="ghost" size="icon-sm" aria-label={t("select")}>
                        <CaretRightIcon />
                    </UiButton>
                )}
            </ItemActions>
        </Item>
    );
};
