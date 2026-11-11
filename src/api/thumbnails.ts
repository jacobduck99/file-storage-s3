import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import { Buffer } from 'node:buffer';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";

type Thumbnail = {
  data: ArrayBuffer;
  mediaType: string;
};

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
    const { videoId } = req.params as { videoId?: string };
    if (!videoId) {
    throw new BadRequestError("Invalid video ID");
    }

    const token = getBearerToken(req.headers);
    const userID = validateJWT(token, cfg.jwtSecret);

    const video = getVideo(cfg.db, videoId);
    if (!video) {
    throw new NotFoundError("Couldn't find video");
    }
    if (video.userID !== userID) {
    throw new UserForbiddenError("You do not own this video");
    }

    const formData = await req.formData();
    const file = formData.get("thumbnail");
    if (!(file instanceof File)) {
    throw new BadRequestError("Thumbnail file missing");
    }

    const MAX_UPLOAD_SIZE = 10 << 20;
    if (file.size > MAX_UPLOAD_SIZE) {
    throw new BadRequestError("File size too big");
    }

    const mediaType = file.type;
    if (mediaType !== "image/jpeg" && mediaType !== "image/png") {
    throw new BadRequestError("File has to be image type jpeg or png");
    }

    const ext = mediaType.split("/")[1];
    const buff = randomBytes(32).toString("base64url");
    const fileName = `${buff}.${ext}`;
    const filePath = path.join(cfg.assetsRoot, fileName);
    await Bun.write(filePath, await file.arrayBuffer());

    video.thumbnailURL = `http://localhost:${cfg.port}/assets/${fileName}`;
    updateVideo(cfg.db, video);

    return respondWithJSON(200, video);
}
