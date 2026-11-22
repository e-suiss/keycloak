package com.esuiss.keycloak.terms;

import org.keycloak.Config;
import org.keycloak.authentication.FormAction;
import org.keycloak.authentication.FormActionFactory;
import org.keycloak.models.AuthenticationExecutionModel.Requirement;
import org.keycloak.models.KeycloakSession;
import org.keycloak.models.KeycloakSessionFactory;
import org.keycloak.provider.ProviderConfigProperty;

import java.util.List;

public class TermFormActionFactory implements FormActionFactory {

    public static final String PROVIDER_ID = "term-registration";

    private static final TermFormAction INSTANCE = new TermFormAction();

    private static final List<ProviderConfigProperty> CONFIG_PROPERTIES = List.of(
            prop(TermFormAction.CONFIG_KEY, "Key", "Unique key for this term (e.g. tos, privacy, marketing). Stored on the user as terms.accepted.<key>.", ProviderConfigProperty.STRING_TYPE, null),
            prop(TermFormAction.CONFIG_TITLE, "Title", "Label shown next to the switch and as the modal title.", ProviderConfigProperty.STRING_TYPE, null),
            modeProp(),
            prop(TermFormAction.CONFIG_CONTENT, "Content (HTML)", "HTML content shown inside the modal. The version is derived automatically from this content (a fingerprint); changing it triggers re-consent.", ProviderConfigProperty.TEXT_TYPE, null));

    private static ProviderConfigProperty prop(String name, String label, String help, String type, String def) {
        ProviderConfigProperty p = new ProviderConfigProperty();
        p.setName(name);
        p.setLabel(label);
        p.setHelpText(help);
        p.setType(type);
        if (def != null) {
            p.setDefaultValue(def);
        }
        return p;
    }

    private static ProviderConfigProperty modeProp() {
        ProviderConfigProperty p = new ProviderConfigProperty();
        p.setName(TermFormAction.CONFIG_MODE);
        p.setLabel("Acceptance");
        p.setHelpText("optional = user may skip; required = must accept; required_read = must open the modal and scroll to the end, then accept.");
        p.setType(ProviderConfigProperty.LIST_TYPE);
        p.setOptions(List.of(
                TermFormAction.MODE_OPTIONAL,
                TermFormAction.MODE_REQUIRED,
                TermFormAction.MODE_REQUIRED_READ));
        p.setDefaultValue(TermFormAction.MODE_REQUIRED);
        return p;
    }

    @Override
    public String getId() {
        return PROVIDER_ID;
    }

    @Override
    public FormAction create(KeycloakSession session) {
        return INSTANCE;
    }

    @Override
    public String getDisplayType() {
        return "Terms & Conditions";
    }

    @Override
    public String getReferenceCategory() {
        return "terms";
    }

    @Override
    public boolean isConfigurable() {
        return true;
    }

    @Override
    public Requirement[] getRequirementChoices() {
        return new Requirement[]{Requirement.REQUIRED, Requirement.DISABLED};
    }

    @Override
    public boolean isUserSetupAllowed() {
        return false;
    }

    @Override
    public String getHelpText() {
        return "A single, individually-configured terms document shown on the registration form (with a view modal).";
    }

    @Override
    public List<ProviderConfigProperty> getConfigProperties() {
        return CONFIG_PROPERTIES;
    }

    @Override
    public void init(Config.Scope config) {

    }

    @Override
    public void postInit(KeycloakSessionFactory factory) {

    }

    @Override
    public void close() {

    }
}
