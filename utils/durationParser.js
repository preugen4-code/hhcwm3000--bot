function parseDuration(input) {

    if (!input) return null;

    input = input.toLowerCase().trim();

    const match = input.match(/^(\d+)(s|m|h|d)$/);

    if (!match) return null;

    const value = Number(match[1]);
    const unit = match[2];

    switch (unit) {

        case "s":
            return value * 1000;

        case "m":
            return value * 60 * 1000;

        case "h":
            return value * 60 * 60 * 1000;

        case "d":
            return value * 24 * 60 * 60 * 1000;

        default:
            return null;

    }

}

function formatDuration(input) {

    input = input.toLowerCase();

    const value = parseInt(input);

    if (input.endsWith("s"))
        return `${value} Second${value === 1 ? "" : "s"}`;

    if (input.endsWith("m"))
        return `${value} Minute${value === 1 ? "" : "s"}`;

    if (input.endsWith("h"))
        return `${value} Hour${value === 1 ? "" : "s"}`;

    if (input.endsWith("d"))
        return `${value} Day${value === 1 ? "" : "s"}`;

    return input;

}

module.exports = {
    parseDuration,
    formatDuration
};
