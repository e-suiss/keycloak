package com.esuiss.keycloak.registration.validation;

import org.keycloak.validate.AbstractStringValidator;
import org.keycloak.validate.ValidationContext;
import org.keycloak.validate.ValidationError;
import org.keycloak.validate.ValidatorConfig;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;

public class MinAgeValidator extends AbstractStringValidator {

    public static final String ID = "min-age";
    public static final String CFG_MIN = "min";
    public static final int DEFAULT_MIN = 18;
    public static final String MESSAGE_TOO_YOUNG = "ageTooYoung";
    public static final String MESSAGE_INVALID_DATE = "invalidBirthDate";

    @Override
    public String getId() {
        return ID;
    }

    @Override
    protected void doValidate(String value, String inputHint, ValidationContext context,
                              ValidatorConfig config) {
        int min = config != null ? config.getIntOrDefault(CFG_MIN, DEFAULT_MIN) : DEFAULT_MIN;

        LocalDate dob;
        try {
            dob = LocalDate.parse(value.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception e) {
            context.addError(new ValidationError(ID, inputHint, MESSAGE_INVALID_DATE));
            return;
        }

        LocalDate today = LocalDate.now();
        if (dob.isAfter(today)) {
            context.addError(new ValidationError(ID, inputHint, MESSAGE_INVALID_DATE));
            return;
        }

        if (!isOldEnough(dob, today, min)) {
            context.addError(new ValidationError(ID, inputHint, MESSAGE_TOO_YOUNG, min));
        }
    }

    public static boolean isOldEnough(LocalDate birthDate, LocalDate today, int minYears) {
        if (birthDate == null || today == null || birthDate.isAfter(today)) {
            return false;
        }
        return Period.between(birthDate, today).getYears() >= minYears;
    }
}
