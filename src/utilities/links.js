export function publicProtocol(request) {
    const forwarded = request.headers["x-forwarded-proto"];
    if (forwarded)
        return forwarded.split(",")[0].trim();
    return process.env.PUBLIC_PROTOCOL || "https";
}

export function publicBaseUrl(request) {
    return `${publicProtocol(request)}://${request.headers["host"]}`;
}
