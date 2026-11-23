// @ts-nocheck
import { lazy } from "react";
import type { Path } from "react-router-dom";
import type { AppRouteObject } from "../../routes";
import { generateEncodedPath } from "../../utils/generateEncodedPath";
import { i18n } from "../../i18n/i18n";

export type IamManagementParams = { realm: string };

const IamManagement = lazy(() => import("../IamManagement"));

export const IamManagementRoute: AppRouteObject = {
    path: "/:realm/iam-management",
    element: <IamManagement />,
    breadcrumb: () => i18n.t("sxNavIam"),
    handle: {
        // Sadece kullanıcı yönetme yetkisi olan admin'ler görebilir/erişebilir.
        access: "manage-users"
    }
};

export const toIamManagement = (params: IamManagementParams): Partial<Path> => ({
    pathname: generateEncodedPath(IamManagementRoute.path, params)
});
