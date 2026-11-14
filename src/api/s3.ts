import { cfg } from "../config.js";
import type { ApiConfig } from "../config.js";
import { s3 } from "bun";

export function generatePresignedURL(
    cfg: ApiConfig,
    key: string,
    expireTime: number,
): string {
    const download = cfg.s3Client.presign(key, {
        expiresIn: expireTime,
    });
    return download;
}
