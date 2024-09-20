import { Route } from "http/routing";

export default class InviteRoute extends Route {
    constructor() {
        super("/invite/:key", "GET");
    }

    async call(request, reply, server) {
        let inviteKey = request.params.key;

        let inviteInfo = await server.db.query(`SELECT uwuso.invites.*, uwuso.users.username AS inviter_username
                                                FROM uwuso.invites
                                                JOIN uwuso.users ON uwuso.invites.inviter = uwuso.users.id
                                                WHERE uwuso.invites.hash = $1::text;`, [request.params.key]);

        if (inviteInfo.rows.length < 1)
            return reply.view("error.ejs", {
                "error_title": "Invalid invite",
                "error_message": "The invite you have provided is invalid."
            });

        let doesUserExist = await server.db.findUserByDisplayName(inviteInfo.rows[0].username);

        if (doesUserExist)
            return reply.view("error.ejs", {
                "error_title": "Invalid invite",
                "error_message": "The invite you have provided is invalid."
            });

        return reply.view("invite.ejs", {
            "invite": inviteInfo.rows[0]
        });
    }
}