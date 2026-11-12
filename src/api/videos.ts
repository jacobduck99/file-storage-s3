import { respondWithJSON } from "./json";
import { BadRequestError, UserForbiddenError } from "./errors";

import { type ApiConfig } from "../config";
import type { BunRequest } from "bun";

export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
    const MAX_UPLOAD_SIZE = 1 << 30; 
    const { videoId } = req.params as { videoId?: string };

    const token = getBearerToken(req.headers);
    const userID = validateJWT(token, cfg.jwtSecret);

    const video = getVideo(cfg.db, videoId); 
    if (userId !== video.userID){
        throw new UserForbiddenError("You do not own this video");
    }

    const formData = await req.formData();
    const file = formData.get("video");

    if (file > MAX_UPLOAD_SIZE){
        throw BadRequest("file size too large");
    }

    return respondWithJSON(200, null);
}
