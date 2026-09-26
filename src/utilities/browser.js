export function isBrowserPageRequest(request) {
    const userAgent = request.headers?.["user-agent"] ?? "";
    const accept = request.headers?.accept ?? "";
    return /Mozilla\/\d/i.test(userAgent) && /text\/html/i.test(accept);
}
