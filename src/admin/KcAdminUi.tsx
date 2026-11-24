import "../globals.css";
import { useEffect, useReducer } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { startColorSchemeManagement } from "./colorScheme";
import { i18n } from "./i18n/i18n";
import { RootRoute } from "./routes";

const router = createHashRouter([RootRoute]);
const prI18nInitialized = i18n.init();
startColorSchemeManagement();

export default function KcAdminUi() {
    const [isI18nInitialized, setI18nInitialized] = useReducer(() => true, false);

    useEffect(() => {
        prI18nInitialized.then(() => setI18nInitialized());
    }, []);

    if (!isI18nInitialized) {
        return null;
    }

    return <RouterProvider router={router} />;
}
