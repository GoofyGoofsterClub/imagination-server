import { isValidDomain } from "utilities/experiments";

export function publicProtocol(request) {
    const forwarded = request.headers["x-forwarded-proto"];
    if (forwarded) {
        const proto = forwarded.split(",")[0].trim().toLowerCase();
        if (proto === "http" || proto === "https")
            return proto;
    }
    return process.env.PUBLIC_PROTOCOL || "https";
}

export function publicHost(request) {
    const raw = request.headers?.["host"];
    if (typeof raw === "string") {
        const normalized = raw.trim().toLowerCase();
        if (normalized && isValidDomain(normalized))
            return normalized;
    }
    return process.env.PUBLIC_HOST || "localhost";
}

export function publicBaseUrl(request) {
    return `${publicProtocol(request)}://${publicHost(request)}`;
}
