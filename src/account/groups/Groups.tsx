// @ts-nocheck
import { UsersIcon } from "@phosphor-icons/react";
import { Badge } from "@ui/components/badge";
import { Checkbox } from "@ui/components/checkbox";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@ui/components/empty";
import { Field, FieldLabel } from "@ui/components/field";
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
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEnvironment } from "../../shared/keycloak-ui-shared";
import { getGroups } from "../api/methods";
import type { Group } from "../api/representations";
import { Page } from "../components/page/Page";
import { usePromise } from "../utils/usePromise";

export const Groups = () => {
    const { t } = useTranslation();
    const context = useEnvironment();

    const [groups, setGroups] = useState<Group[]>([]);
    const [directMembership, setDirectMembership] = useState(false);

    usePromise(
        signal => getGroups({ signal, context }),
        groups => {
            if (!directMembership) {
                groups.forEach(el =>
                    getParents(
                        el,
                        groups,
                        groups.map(({ path }) => path)
                    )
                );
            }
            setGroups(groups);
        },
        [directMembership]
    );

    const getParents = (el: Group, groups: Group[], groupsPaths: string[]) => {
        const parentPath = el.path.slice(0, el.path.lastIndexOf("/"));
        if (parentPath && !groupsPaths.includes(parentPath)) {
            el = {
                name: parentPath.slice(parentPath.lastIndexOf("/") + 1),
                path: parentPath
            };
            groups.push(el);
            groupsPaths.push(parentPath);
            getParents(el, groups, groupsPaths);
        }
    };

    return (
        <Page title={t("groups")} description={t("groupDescriptionLabel")}>
            <div className="space-y-7">
                <Field orientation="horizontal" className="w-fit">
                    <Checkbox
                        id="directMembership-checkbox"
                        data-testid="directMembership-checkbox"
                        checked={directMembership}
                        onCheckedChange={checked => setDirectMembership(checked === true)}
                    />
                    <FieldLabel htmlFor="directMembership-checkbox" className="font-normal">
                        {t("directMembership")}
                    </FieldLabel>
                </Field>

                {groups.length === 0 ? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <UsersIcon />
                            </EmptyMedia>
                            <EmptyTitle>{t("noGroups", "—")}</EmptyTitle>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <section>
                        <h3 className="mb-2 ms-1 text-sm font-medium text-muted-foreground">
                            {t("groups")}
                        </h3>
                        <ItemGroup variant="inset" id="groups-list">
                            {groups.map((group, i) => (
                                <Fragment key={`group-${i}`}>
                                    {i > 0 && <ItemSeparator />}
                                    <Item size="sm" role="listitem" id={`${i}-group`}>
                                        <ItemMedia variant="icon">
                                            <UsersIcon />
                                        </ItemMedia>
                                        <ItemContent className="min-w-0">
                                            <ItemTitle data-testid={`group[${i}].name`}>
                                                {group.name}
                                            </ItemTitle>
                                            <ItemDescription id={`${i}-group-path`}>
                                                {group.path}
                                            </ItemDescription>
                                        </ItemContent>
                                        <ItemActions id={`${i}-group-directMembership`}>
                                            {group.id != null && (
                                                <Badge variant="outline">
                                                    {t("directMembership")}
                                                </Badge>
                                            )}
                                        </ItemActions>
                                    </Item>
                                </Fragment>
                            ))}
                        </ItemGroup>
                    </section>
                )}
            </div>
        </Page>
    );
};

export default Groups;
