
export async function processVideoForStart(inputFilePath: string): Promise<string>{
    const finalPath = `${inputFilePath}.final`;

    const proc = Bun.spawn(["ffmpeg", "-i", inputFilePath, "-movflags", "faststart", "-map_metadata", "0", "-codec", "copy", "-f", "mp4", finalPath], {
    })

    return finalPath;
}

