import { Route } from "http/routing";
import addView from "utilities/addview";

export default class NewImageServing extends Route {
    constructor() {
        super("/:filename", "GET");
    }

    async call(request, reply, server) {
        let doesFileExist = await server.odb.checkDocumentExists("uploads", {
            "filename": request.params.filename
        });

        if (!doesFileExist) {
            reply.status(404);
            return reply.view("error.ejs", {
                "error_title": "Not Found",
                "error_message": "<p>This page doesn't exist.</p><img src='/public/img/uhhh.jpg'>"
            });
        }

        let file = await server.odb.getDocument("uploads", {
            "filename": request.params.filename
        });

        await addView(server.odb, file.filename, file.uploader);

        let fileMimetype = file.mimetype;
        if (
            !fileMimetype.match(/image\/.*/g) &&
            !fileMimetype.match(/video\/.*/g) &&
            !fileMimetype.match(/audio\/.*/g) &&
            !fileMimetype.match(/application\/pdf/g)
        )
            reply.header("Content-Disposition", `attachment; filename="${file.filename}.${file.file_ext ? file.file_ext : ""}"`);

        reply.type(file.mimetype);

        reply.sendFile(file.actual_filename, {
            "root": `${__dirname}/../../privateuploads`
        });
    }
}