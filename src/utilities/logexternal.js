import axios from "axios";

export class ExternalLogging
{
    constructor(webhook_url, maxPerMinute = Number(process.env.LOG_WEBHOOK_MAX_PER_MINUTE) || 20)
    {
        this.webhook_url = webhook_url;
        this.enabled = this.webhook_url ? true : false;
        this.maxPerMinute = maxPerMinute;
        this.windowStart = 0;
        this.sentInWindow = 0;
        this.dropped = 0;
    }

    async Log(message)
    {
        if(!this.enabled)
            return;

        const now = Date.now();
        if (now - this.windowStart >= 60000)
        {
            this.windowStart = now;
            this.sentInWindow = 0;
        }

        if (this.sentInWindow >= this.maxPerMinute)
        {
            this.dropped++;
            return;
        }
        this.sentInWindow++;

        if (this.dropped > 0)
        {
            message = { ...message, content: `${message.content ?? ""}\n(${this.dropped} log message(s) were dropped due to rate limiting.)` };
            this.dropped = 0;
        }

        try
        {
            return await axios.post(this.webhook_url, message, { timeout: 10000 });
        }
        catch (e)
        {
            console.error(`[err][logexternal] Failed to deliver webhook log: ${e.message}`);
        }
    }
}

function type_to_color(type)
    {
    switch(type)
    {
        case "sys":
            return convertColor(255, 0, 0);
        case "warn":
            return convertColor(255, 255, 0);
        case "info":
            return convertColor(0, 255, 0);
        case "debug":
            return convertColor(0, 0, 255);
        default:
            return convertColor(255, 255, 255);
    }
}

export default ExternalLogging;

export class Field
{
    constructor(name, value, inline)
    {
        this.name = name;
        this.value = value;
        this.inline = inline;
    }
}

export function buildMessage(server_name, type, title, message, image = null, ...fields)
{
    return {
        "content": `A log has been received from \`${server_name}\`.`,
        "embeds": [
            {
                "title": title,
                "color": type_to_color(type),
                "timestamp": new Date().toISOString(),
                "url": `https://${server_name}`,
                "author": {
                    "url": `https://${server_name}`,
                    "name": server_name,
                    "icon_url": "https://uwu.so/mishashto/milpp3GDP7"
                },
                "image": {
                    "url": image
                },
                "footer": {
                    "icon_url": "https://uwu.so/mishashto/miJMzHBsVG",
                    "text": "logged"
                },
                "fields": fields,
                "description": message
            }
        ]
    }
}

export function convertColor(r,g,b)
{
    return (r * 65536) + (g * 256) + b;
}