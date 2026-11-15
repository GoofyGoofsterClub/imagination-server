export function withDeadline(operation, milliseconds, label = "Operation") {
    let timer;
    return Promise.race([
        Promise.resolve().then(operation),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${milliseconds}ms`)), milliseconds);
            timer.unref();
        })
    ]).finally(() => clearTimeout(timer));
}
