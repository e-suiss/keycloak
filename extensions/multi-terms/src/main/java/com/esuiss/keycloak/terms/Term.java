package com.esuiss.keycloak.terms;

public class Term {
    public String key;
    public String title;
    public String version;
    public boolean required;
    public boolean mustRead;
    public String content;

    public Term() {
    }

    public Term(String key, String title, String version, boolean required, boolean mustRead, String content) {
        this.key = key;
        this.title = title;
        this.version = version;
        this.required = required;
        this.mustRead = mustRead;
        this.content = content;
    }

    public String getKey() {
        return key;
    }

    public String getTitle() {
        return title;
    }

    public String getVersion() {
        return version;
    }

    public boolean isRequired() {
        return required;
    }

    public boolean isMustRead() {
        return mustRead;
    }

    public String getContent() {
        return content;
    }
}
