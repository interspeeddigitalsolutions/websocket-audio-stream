const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5173;
const HLS_FOLDER = path.join(__dirname, "hls");
if (!fs.existsSync(HLS_FOLDER)) fs.mkdirSync(HLS_FOLDER);

app.use(express.json());
app.use("/hls", express.static(HLS_FOLDER));

const streams = new Map(); // Store active FFmpeg processes

app.post("/start-stream", (req, res) => {
    const { rtmpUrl } = req.body;
    if (!rtmpUrl) return res.status(400).json({ success: false, message: "RTMP URL is required." });
    
    const streamKey = `stream-${Date.now()}`;
    const streamPath = path.join(HLS_FOLDER, streamKey);
    if (!fs.existsSync(streamPath)) fs.mkdirSync(streamPath);

    const ffmpegCmd = [
        "-i", rtmpUrl,
        "-c:a", "aac", "-b:a", "128k", "-f", "hls",
        "-hls_time", "1", "-hls_list_size", "2", "-hls_flags", "delete_segments+append_list",
        path.join(streamPath, "audio.m3u8")
    ];

    const ffmpegProcess = spawn("ffmpeg", ffmpegCmd);
    streams.set(streamKey, ffmpegProcess);

    ffmpegProcess.stderr.on("data", data => console.error(`FFmpeg Error: ${data}`));
    ffmpegProcess.on("close", () => streams.delete(streamKey));

    res.json({ success: true, streamUrl: `/player?streamKey=${streamKey}` });
});

app.get("/setup-stream", (req, res) => {
    res.send(`
    <html>
      <head>
        <title>Setup Stream</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          input, button { font-size: 16px; padding: 10px; margin: 5px; border-radius: 5px; }
          input { width: 300px; border: 2px solid #79bb24; }
          button { background-color: #a1d75e; border: none; cursor: pointer; }
          #streamUrl { width: 350px; border: 2px solid #79bb24; background: #f4f4f4; }
        </style>
      </head>
      <body>
        <h1>Setup Your RTMP Stream</h1>
        <input type="text" id="rtmpUrl" placeholder="Enter RTMP URL" />
        <button onclick="startStream()">Start Streaming</button>
        <br>
        <input type="text" id="streamUrl" readonly onclick="this.select()" placeholder="Your Stream URL will appear here" />
        <script>
          function startStream() {
            const rtmpUrl = document.getElementById("rtmpUrl").value;
            if (!rtmpUrl) return alert("Please enter an RTMP URL.");
            fetch("/start-stream", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rtmpUrl })
            })
            .then(response => response.json())
            .then(data => document.getElementById("streamUrl").value = window.location.origin + data.streamUrl)
            .catch(error => console.error("Request failed:", error));
          }
        </script>
      </body>
    </html>
    `);
});

// Player Page
app.get("/player", (req, res) => {
  const { streamKey } = req.query;
  if (!streamKey) return res.status(400).send("Stream key required.");

  res.send(`
    <html>
      <head>
        <title>HLS Player</title>
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        <style>
          body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
          .wave { width: 100px; height: 100px; background: linear-gradient(45deg, #79bb24, #4caf50); border-radius: 50%; animation: pulse 2s infinite; }
          @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        </style>
      </head>
      <body>
        <h1>Listening to Stream</h1>
        <div class="wave"></div>
        <audio id="audio" controls></audio>
	<br/><b>click to play live stream</b>
        <script>
          if (Hls.isSupported()) {
            var audio = document.getElementById("audio");
            var hls = new Hls();
            hls.loadSource("/hls/${streamKey}/audio.m3u8");
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, () => audio.play());
          } else {
            audio.src = "/hls/${streamKey}/audio.m3u8";
          }
        </script>
      </body>
    </html>
  `);
});

function shutdownServer() {
    console.log("Shutting down server...");
    streams.forEach(proc => proc.kill("SIGTERM"));
    process.exit(0);
}
process.on("SIGINT", shutdownServer);
process.on("SIGTERM", shutdownServer);

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
