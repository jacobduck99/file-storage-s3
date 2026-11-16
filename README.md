# Tubely

A video hosting backend built with TypeScript and Bun. Users sign up, create video drafts, upload thumbnails and MP4s, and the videos are served from AWS S3 through a CloudFront CDN.

Built while working through boot.dev's [Learn File Servers and CDNs with S3 and CloudFront](https://www.boot.dev/courses/learn-file-servers-s3-cloudfront-typescript) course. The course provided the frontend and database layer; I implemented the upload handlers, the FFmpeg processing, and the S3 and CloudFront integration.

## How It Works

**Video upload** (`POST /api/video_upload/:videoId`):

1. **Auth and ownership.** The JWT is validated, and only the video's owner can upload to it.
2. **Validation.** The upload must be `video/mp4` and at most 1 GB.
3. **Aspect ratio.** `ffprobe` reads the video's width and height and classifies it as `landscape` (16:9), `portrait` (9:16) or `other`.
4. **Fast start.** `ffmpeg` moves the MP4's `moov` atom to the front of the file (`-movflags faststart`, no re-encode), so browsers can start playing before the whole file has downloaded.
5. **Upload to S3.** The processed file is stored under a key prefixed with its aspect ratio, e.g. `portrait/<videoId>.mp4`.
6. **Serve through CloudFront.** The video's URL is set to the CloudFront distribution, so viewers are served from the CDN edge, not the bucket directly.
7. **Cleanup.** Temp files are deleted in a `finally` block, so a failed `ffprobe`, `ffmpeg` or S3 upload never leaves files behind on disk.

**Thumbnails** are validated (JPEG or PNG, at most 10 MB) and saved to the local `assets/` directory under a random 32-byte filename, so URLs can't be guessed and a new thumbnail never gets a stale cached copy.

**Auth** uses hashed passwords (`Bun.password`), JWT access tokens, and refresh tokens stored in SQLite that can be revoked.

## API

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/users` | Create a user |
| `POST` | `/api/login` | Log in, returns access and refresh tokens |
| `POST` | `/api/refresh` | Get a new access token from a refresh token |
| `POST` | `/api/revoke` | Revoke a refresh token |
| `GET` | `/api/videos` | List your videos |
| `POST` | `/api/videos` | Create a video draft |
| `GET` | `/api/videos/:videoId` | Get one video |
| `DELETE` | `/api/videos/:videoId` | Delete a video |
| `POST` | `/api/thumbnail_upload/:videoId` | Upload a thumbnail (`thumbnail` form field) |
| `POST` | `/api/video_upload/:videoId` | Upload an MP4 (`video` form field) |
| `POST` | `/admin/reset` | Reset the database (only when `PLATFORM=dev`) |

## Requirements

- [Bun](https://bun.sh/)
- [FFmpeg](https://ffmpeg.org/download.html): both `ffmpeg` and `ffprobe` must be on your `PATH`
- An AWS S3 bucket and a CloudFront distribution in front of it
- SQLite 3 (optional, only to inspect the database by hand)

## Running Locally

```bash
bun install
./samplesdownload.sh      # optional: sample images and videos in samples/
cp .env.example .env      # then fill in your values
bun run start
```

The server type-checks, then starts at `http://localhost:8091` (or your `PORT`) and serves the web UI at `/`. It creates `tubely.db` and the `assets/` directory on first run.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DB_PATH` | Path to the SQLite database file |
| `JWT_SECRET` | Secret used to sign access tokens. Use a long random value |
| `PLATFORM` | `dev` enables Bun's dev mode and the `/admin/reset` route |
| `FILEPATH_ROOT` | Root of the frontend files |
| `ASSETS_ROOT` | Where thumbnails are stored |
| `S3_BUCKET`, `S3_REGION` | Your S3 bucket and its region |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credentials Bun's S3 client uses for uploads |
| `S3_CF_DISTRO` | CloudFront base URL, including `https://` and a trailing `/` |
| `PORT` | Port to listen on |

`.env` is gitignored. Never commit real AWS keys.

## Scripts

```bash
bun run typecheck   # tsc --noEmit
bun run start       # type-check, then start the server
```

## Tech Stack

TypeScript · Bun · SQLite (`bun:sqlite`) · AWS S3 · CloudFront · FFmpeg · JWT
