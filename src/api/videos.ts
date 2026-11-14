import { respondWithJSON } from "./json";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";
import { getVideo, updateVideo } from "../db/videos";
import { getBearerToken, validateJWT } from "../auth";
import { type ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { s3, write, S3Client } from "bun";
import { getVideoAspectRatio } from "./video-aspect-ratio.js";
import { processVideoForFastStart } from "./process-video.js";

export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
    const MAX_UPLOAD_SIZE = 1 << 30; 
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
    if (userID !== video.userID){
        throw new UserForbiddenError("You do not own this video");
    }

    const formData = await req.formData();
    const file = formData.get("video");
    if (!(file instanceof File)) {
        throw new BadRequestError("Video file missing");
    }

    if (file.size > MAX_UPLOAD_SIZE){
        throw new BadRequestError("file size too large");
    }

    const mediaType = file.type;
    if (mediaType !== "video/mp4"){
        throw new BadRequestError("video not mp4");
    }

    const path = `./tmp/${videoId}.mp4`;
    await Bun.write(path, file);

    const fileContents = Bun.file(path);
    const aspectRatio = await getVideoAspectRatio(path);
    const processedVideo = await processVideoForFastStart(path);

    const s3file = cfg.s3Client.file(`${aspectRatio}/${videoId}.mp4`);
    const processedVideoContents = Bun.file(processedVideo);
    await s3file.write(processedVideoContents, { type: mediaType });

    const s3URL = `https://${cfg.s3Bucket}.s3.${cfg.s3Region}.amazonaws.com/${aspectRatio}/${videoId}.mp4`;
    await fileContents.delete();
    await processedVideoContents.delete();
    
    video.videoURL = s3URL;
    updateVideo(cfg.db, video);
    return respondWithJSON(200, null);
}
