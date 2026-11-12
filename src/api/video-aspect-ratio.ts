
export async function getVideoAspectRatio(filepath: string): Promise {
    const proc = Bun.spawn(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", filepath],{
        stdout: "pipe",
        stderr: "pipe",
    });
    
    const stdoutText = await new Response(proc.stdout).text();
    const stderrText = await new Response(proc.stderr).text();

    console.log("stdoutText", stdoutText);
    console.log("stderrText", stderrText);
}
