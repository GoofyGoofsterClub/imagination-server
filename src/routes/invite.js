import { Route } from "http/routing";

export default class InviteRoute extends Route {
    constructor() {
        super("/invite/:key", "GET");
    }

    async call(request, reply, server) {
        let inviteKey = request.params.key;

        let doesExist = await server.odb.checkDocumentExists("invites", {
            "hash": inviteKey
        });

        if (!doesExist)
            return reply.view("error.ejs", {
                "error_title": "Invalid invite",
                "error_message": "The invite you have provided is invalid."
            });

        let invite = await server.odb.getDocument("invites", {
            "hash": inviteKey
        });

        let doesUserExist = await server.odb.checkDocumentExists("users", {
            "displayName": invite.displayName
        });

        if (doesUserExist)
            return reply.view("error.ejs", {
                "error_title": "Invalid invite",
                "error_message": "The invite you have provided is invalid."
            });

        return reply.view("invite.ejs", {
            "invite": invite
        });
    }
}