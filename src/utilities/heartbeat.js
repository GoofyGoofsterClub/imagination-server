import { PresetOutput } from "utilities/output";
import axios from "axios";

export default class HeartbeatManager
{
    constructor(heartbeatUrl, secret)
    {
        this.Output = new PresetOutput("hbt");
        this.heartbeatUrl = heartbeatUrl;
        this.secret = this.secret;
        this.interval = 3000;

        this._interval = null;

        if (!this.heartbeatUrl)
            this.Output.Warn("Impossible to start heartbeat, because no heartbeat URL is specified.");
    }

    start()
    {
        if (this._interval != null || !this.heartbeatUrl)
            return false;

        this._interval = setInterval(this.heartbeat, this.interval,
                                    this.Output, this.heartbeatUrl,
                                    this.secret);
        this.Output.Log("Heartbeat worker has been started.");
        return true;
    }

    stop(reason)
    {
        if (this._interval == null)
            return false;

        clearInterval(this._interval);
        this._interval = null;
        this.Output.Warn("Heartbeat worker has been stopped" + (reason ? ` because: ${reason}.` : '.'));
        return true;
    }

    async heartbeat(Output, heartbeatUrl, secret)
    {
        Output.Log("Sending a heartbeat to remote server...");

        try
        {
            let result = await axios.get(heartbeatUrl, {
                headers: {
                    "X-Requested-With": "imagination-server",
                    "User-Agent": "Agent/imagination-server (heartbeat)",
                    "Authorization": secret
                }
            });
    
            if (result.status != 200)
                Output.Warn(`Heartbeat response status code was ${result.status}. Might be dead?`);
        }
        catch (e)
        {
            Output.Error(`Error during heartbeat request: ${e}`);
        }
    }
}