import { Route } from "http/routing";

function invalidInviteView(reply) {
    return reply.viewAsync("error.ejs", {
        "error_title": "Invalid invite",
        "error_message": "The invite you have provided is invalid."
    });
}

export default class InviteRoute extends Route {
    constructor() {
        super("/invite/:key", "GET");
    }

    async call(request, reply, server) {
        let inviteInfo = await server.db.query(`SELECT uwuso.invites.*, uwuso.users.username AS inviter_username
                                                FROM uwuso.invites
                                                JOIN uwuso.users ON uwuso.invites.inviter = uwuso.users.id
                                                WHERE uwuso.invites.hash = $1::text;`, [request.params.key]);

        if (inviteInfo.rows.length < 1)
            return invalidInviteView(reply);

        let invite = inviteInfo.rows[0];

        if (invite.valid_until * 1000 < Date.now())
            return invalidInviteView(reply);

        let doesUserExist = await server.db.findUserByDisplayName(invite.username);

        if (doesUserExist)
            return invalidInviteView(reply);

        return reply.viewAsync("invite.ejs", {
            "invite": invite
        });
    }
}