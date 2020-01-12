exports.setDefaults = function(passed, defaultValues) {
    for (let key in passed) {
        if (passed.hasOwnProperty(key)) {
            defaultValues[key] = passed[key];
        }
    }
    return defaultValues;
};
