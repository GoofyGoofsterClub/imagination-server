import 'colors';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const OTLP_ENDPOINT = process.env.OTLP_LOG_ENDPOINT;
const OTLP_SERVICE_NAME = process.env.OTLP_SERVICE_NAME || 'imagination-server';

let logger = null;
let loggerProvider = null;
let otlpEnabled = false;

if (OTLP_ENDPOINT) {
    try {
        const resource = resourceFromAttributes({
            [SemanticResourceAttributes.SERVICE_NAME]: OTLP_SERVICE_NAME,
            [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0'
        });

        const exporter = new OTLPLogExporter({
            url: OTLP_ENDPOINT
        });

        loggerProvider = new LoggerProvider({
            resource,
            processors: [new BatchLogRecordProcessor(exporter)]
        });
        logs.setGlobalLoggerProvider(loggerProvider);

        logger = logs.getLogger(OTLP_SERVICE_NAME);
        otlpEnabled = true;
    } catch (e) {
        console.error(`[err][sys] Failed to initialize OTLP logger: ${e.message}`.red);
    }
}

function emitOtlLog(severityNumber, severityText, sender, message) {
    if (!logger) return;
    try {
        logger.emit({
            severityNumber,
            severityText,
            body: message,
            attributes: {
                component: sender
            }
        });
    } catch (e) {
        console.error(`[err][sys] Failed to emit OTLP log: ${e.message}`.red);
    }
}

export default class Output
{
    static Log(sender="worker", ...message)
    {
        if (message.length < 1) {
            if (otlpEnabled) {
                emitOtlLog(SeverityNumber.INFO, 'INFO', 'sys', sender);
            } else {
                console.log(`${"[log]".cyan}[sys] ${sender}`);
            }
        } else {
            const text = message.join(" ");
            if (otlpEnabled) {
                emitOtlLog(SeverityNumber.INFO, 'INFO', sender, text);
            } else {
                console.log(`${"[log]".cyan}[${sender}] ${text}`);
            }
        }
    }
    static Warn(sender="worker", ...message)
    {
        if (message.length < 1) {
            if (otlpEnabled) {
                emitOtlLog(SeverityNumber.WARN, 'WARN', 'sys', sender);
            } else {
                console.log(`${"[wrn]".yellow}[sys] ${sender}`);
            }
        } else {
            const text = message.join(" ");
            if (otlpEnabled) {
                emitOtlLog(SeverityNumber.WARN, 'WARN', sender, text);
            } else {
                console.log(`${"[wrn]".yellow}[${sender}] ${text}`);
            }
        }
    }
    static Error(sender="worker", ...message)
    {
        if (message.length < 1) {
            if (otlpEnabled) {
                emitOtlLog(SeverityNumber.ERROR, 'ERROR', 'sys', sender);
            } else {
                console.log(`${"[err]".red}[sys] ${sender}`);
            }
        } else {
            const text = message.join(" ");
            if (otlpEnabled) {
                emitOtlLog(SeverityNumber.ERROR, 'ERROR', sender, text);
            } else {
                console.log(`${"[err]".red}[${sender}] ${text}`);
            }
        }
    }
    static Unformatted(...message)
    {
        console.log(...message);
    }
}

export class PresetOutput
{
    constructor(name)
    {
        this.name = name;
    }

    Log(...message)
    {
        Output.Log(this.name, ...message);
    }
    Warn(...message)
    {
        Output.Warn(this.name, ...message);
    }
    Error(...message)
    {
        Output.Error(this.name, ...message);
    }
}

export async function shutdownLogger()
{
    if (loggerProvider) {
        await loggerProvider.shutdown();
    }
}
