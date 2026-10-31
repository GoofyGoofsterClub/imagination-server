export function publicProtocol(request) {
    const forwarded = request.headers["x-forwarded-proto"];
    if (forwarded) {
        const proto = forwarded.split(",")[0].trim().toLowerCase();
        if (proto === "http" || proto === "https")
            return proto;
    }
    return process.env.PUBLIC_PROTOCOL || "https";
}

export function publicBaseUrl(request) {
    return `${publicProtocol(request)}://${request.headers["host"]}`;
}
