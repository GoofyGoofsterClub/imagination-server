import 'colors';
import pkg from '../../package.json';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const SERVICE_NAME = 'imagination-server';
const DEFAULT_SERVICE_VERSION = pkg.version;
const OTLP_ENDPOINT = process.env.OTLP_LOG_ENDPOINT;
const OTLP_SERVICE_NAME = process.env.OTLP_SERVICE_NAME || SERVICE_NAME;

let logger = null;
let loggerProvider = null;
let otlpEnabled = false;

if (OTLP_ENDPOINT) {
    try {
        const resource = resourceFromAttributes({
            [SemanticResourceAttributes.SERVICE_NAME]: OTLP_SERVICE_NAME,
            [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || DEFAULT_SERVICE_VERSION
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
    static _emit(severityNumber, severityText, tag, sender, ...message)
    {
        const isEmpty = message.length < 1;
        const body = isEmpty ? sender : message.join(" ");
        if (otlpEnabled) {
            emitOtlLog(severityNumber, severityText, isEmpty ? 'sys' : sender, body);
        } else {
            console.log(`${tag}[${isEmpty ? 'sys' : sender}] ${body}`);
        }
    }
    static Log(sender="worker", ...message) { this._emit(SeverityNumber.INFO, 'INFO', '[log]'.cyan, sender, ...message); }
    static Warn(sender="worker", ...message) { this._emit(SeverityNumber.WARN, 'WARN', '[wrn]'.yellow, sender, ...message); }
    static Error(sender="worker", ...message) { this._emit(SeverityNumber.ERROR, 'ERROR', '[err]'.red, sender, ...message); }
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
