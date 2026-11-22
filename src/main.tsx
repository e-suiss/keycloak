import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { KcPage } from "./kc.gen";

// The following block can be uncommented to test a specific page with `yarn dev`
// Don't forget to comment back or your bundle size will increase
/*
import { getKcContextMock } from "./login/KcPageStory";

if (import.meta.env.DEV) {
    window.kcContext = getKcContextMock({
        pageId: "register.ftl",
        overrides: {}
    });
}
*/

const root = createRoot(document.getElementById("root")!);
const kcContext = window.kcContext;

if (kcContext?.themeType === "login") {
    // The login page is loaded before the first render instead of through kc.gen's React.lazy +
    // Suspense: React 19 holds back content that suspended for up to 300 ms (Suspense throttling),
    // and every login step is a full page load, so that would be a blank screen on each step.
    import("./login/KcPage").then(({ default: KcLoginPage }) =>
        root.render(
            <StrictMode>
                <KcLoginPage kcContext={kcContext} />
            </StrictMode>
        )
    );
} else {
    root.render(<StrictMode>{!kcContext ? <h1>No Keycloak Context</h1> : <KcPage kcContext={kcContext} />}</StrictMode>);
}
