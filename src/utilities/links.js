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
        if (normalized && isValidDomain(normalized)) {
            const allowed = process.env.PUBLIC_HOSTS;
            if (allowed) {
                const host = normalized.split(":")[0];
                const list = allowed.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
                if (!list.includes(host))
                    return process.env.PUBLIC_HOST || "localhost";
            }
            return normalized;
        }
    }
    return process.env.PUBLIC_HOST || "localhost";
}

export function publicBaseUrl(request) {
    return `${publicProtocol(request)}://${publicHost(request)}`;
}
