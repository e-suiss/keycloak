/**
 * WARNING: Before modifying this file, run the following command:
 *
 * $ npx keycloakify own --path "admin/components/form/FormAccess.tsx"
 *
 * This file is provided by @keycloakify/keycloak-admin-ui version 260601.0.1.
 * It was copied into your repository by the postinstall script: `keycloakify sync-extensions`.
 */

/* eslint-disable */

// @ts-nocheck

import type { AccessType } from "@keycloak/keycloak-admin-client/lib/defs/whoAmIRepresentation";
import {
    Children,
    type ComponentProps,
    cloneElement,
    isValidElement,
    type PropsWithChildren,
    type ReactElement,
    type ReactNode
} from "react";
import { Controller } from "react-hook-form";

import { useAccess } from "../../context/access/Access";
import { FixedButtonsGroup } from "./FixedButtonGroup";

/**
 * Layout/container component names whose children must be recursed into without
 * injecting the `isDisabled` prop onto the container itself.
 */
const LAYOUT_COMPONENT_NAMES = new Set([
    "FormGroup",
    "GridItem",
    "Grid",
    "ActionGroup",
    "ClipboardCopy",
    "Stack",
    "StackItem"
]);

const getComponentName = (type: any): string | undefined => {
    if (typeof type === "function" || typeof type === "object") {
        return type?.displayName || type?.name;
    }
    return undefined;
};

export type FormAccessProps = Omit<ComponentProps<"form">, "ref"> & {
    /** Legacy PatternFly Form layout props (no-op on the native form element). */
    isHorizontal?: boolean;
    isWidthLimited?: boolean;
    maxWidth?: string;

    /**
     * One of the AccessType's that the user needs to have to view this form. Also see {@link useAccess}.
     * @type {AccessType}
     */
    role: AccessType;

    /**
     * An override property if fine grained access has been setup for this form.
     * @type {boolean}
     */
    fineGrainedAccess?: boolean;

    /**
     * Set unWrap when you don't want this component to wrap your "children" in a {@link Form} component.
     * @type {boolean}
     */
    unWrap?: boolean;

    /**
     * Overwrite the fineGrainedAccess and make form regardless of access rights.
     */
    isReadOnly?: boolean;
};

/**
 * Use this in place of a patternfly Form component and add the `role` and `fineGrainedAccess` properties.
 * @param {FormAccessProps} param0 - all properties of Form + role and fineGrainedAccess
 */
export const FormAccess = ({
    children,
    role,
    fineGrainedAccess = false,
    isReadOnly = false,
    unWrap = false,
    // Strip legacy PatternFly Form layout props so they don't leak onto the DOM <form>.
    isHorizontal: _isHorizontal,
    isWidthLimited: _isWidthLimited,
    maxWidth: _maxWidth,
    ...rest
}: PropsWithChildren<FormAccessProps>) => {
    const { hasAccess } = useAccess();

    const recursiveCloneChildren = (children: ReactNode, newProps: any): ReactNode => {
        return Children.map(children, child => {
            if (!isValidElement(child)) {
                return child;
            }

            if (child.props) {
                const element = child as ReactElement;
                if (child.type === Controller) {
                    return cloneElement(child, {
                        ...element.props,
                        render: (props: any) => {
                            const renderElement = element.props.render(props);
                            return cloneElement(renderElement, {
                                ...renderElement.props,
                                ...newProps
                            });
                        }
                    });
                }
                const children = recursiveCloneChildren(element.props.children, newProps);
                const componentName = getComponentName(child.type);

                if (child.type === FixedButtonsGroup) {
                    return cloneElement(child, {
                        isActive: !newProps.isDisabled,
                        children
                    } as any);
                }
                if (componentName === "TextArea" || componentName === "Textarea") {
                    return cloneElement(child, {
                        readOnly: newProps.isDisabled,
                        children
                    } as any);
                }

                return cloneElement(
                    child,
                    componentName && LAYOUT_COMPONENT_NAMES.has(componentName)
                        ? { children }
                        : { ...newProps, children }
                );
            }
            return child;
        });
    };

    const isDisabled = isReadOnly || (!hasAccess(role) && !fineGrainedAccess);

    return (
        <>
            {!unWrap && (
                <form
                    {...rest}
                    className={`keycloak__form space-y-4 ${rest.className || ""}`}
                >
                    {recursiveCloneChildren(children, isDisabled ? { isDisabled } : {})}
                </form>
            )}
            {unWrap && recursiveCloneChildren(children, isDisabled ? { isDisabled } : {})}
        </>
    );
};
