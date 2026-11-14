
export async function processVideoForFastStart(inputFilePath: string): Promise<string>{
    const finalPath = `${inputFilePath}.final`;

    const proc = Bun.spawn(["ffmpeg", "-i", inputFilePath, "-movflags", "faststart", "-map_metadata", "0", "-codec", "copy", "-f", "mp4", finalPath], {
        stderr: "pipe",
    })

    const exitCode = await proc.exited;

    if (exitCode !== 0){
        const stderrText = await new Response(proc.stderr).text();
        throw new Error(`ffmpeg error: ${stderrText}`);
    }

    return finalPath;
}

