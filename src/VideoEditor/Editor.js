// /* eslint-disable func-names */
import { useState, useRef, useEffect } from "react";
import "../editor.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faVolumeMute,
  faVolumeUp,
  faPause,
  faPlay,
  faSync,
  faCamera,
  faDownload,
  faEraser,
} from "@fortawesome/free-solid-svg-icons";
import "./video.css";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";
import "./video.css";
import { Rnd } from "react-rnd";

function Editor({
  videoUrl,
  videoBlob,
  timings,
  setTimings,
  setIsAdding,
  videos,
  index,
  setAllTimings,
  allTimings,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [difference, setDifference] = useState(0.2);
  const [, setDeletingGrabber] = useState(false);
  const [currentWarning, setCurrentWarning] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [trimmingDone, setTrimmingDone] = useState(false);
  const [seekerBar, setSeekerBar] = useState(0);
  const currentlyGrabbedRef = useRef({ index: 0, type: "none" });
  const playVideoRef = useRef();
  const progressBarRef = useRef();
  const playBackBarRef = useRef();
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const subtitleRef = useRef(null);
  const [boxData, setBoxData] = useState({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
  });
  const aspectRatio = 9 / 16;
  const [trimmedVideo, setTrimmedVideo] = useState(null);
  const [ready, setReady] = useState(false);
  const ffmpeg = useRef(null);
  const [outputVideoUrl] = useState(null);
  const warnings = {
    delete_grabber: (
      <div>Please click on the grabber (either start or end) to delete it</div>
    ),
  };

  const load = async () => {
    try {
      await ffmpeg.current.load();
      setReady(true);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    ffmpeg.current = createFFmpeg({
      log: true,
      corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js",
    });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (playVideoRef.current.onloadedmetadata) {
      const currentIndex = currentlyGrabbedRef.current.index;
      const currentTiming = timings[currentIndex];
      console.log(playVideoRef.current.currentTime);
      const seek =
        ((playVideoRef.current.currentTime - currentTiming.start) /
          playVideoRef.current.duration) *
        100;
      setSeekerBar(seek);
      progressBarRef.current.style.width = `${seekerBar}%`;
      if (playVideoRef.current.currentTime >= currentTiming.end) {
        playVideoRef.current.pause();
        setPlaying(false);
        if (currentIndex < timings.length - 1) {
          currentlyGrabbedRef.current = {
            index: currentIndex + 1,
            type: "start",
          };
          progressBarRef.current.style.width = "0%";
          progressBarRef.current.style.left = `${
            (timings[currentIndex + 1].start / playVideoRef.current.duration) *
            100
          }%`;
          playVideoRef.current.currentTime = timings[currentIndex + 1].start;
          playVideoRef.current.play();
          setPlaying(true);
        } else {
        }
      }
    }

    window.addEventListener("keyup", (event) => {
      if (event.key === " ") {
        playPause();
      }
    });

    const time = timings;
    playVideoRef.current.onloadedmetadata = () => {
      if (time.length === 0) {
        time.push({ start: 0, end: playVideoRef.current.duration });
        setTimings(time);
        addActiveSegments();
      } else {
        addActiveSegments();
      }
    };
  });
  useEffect(() => {
    return window.removeEventListener("mouseup", removeMouseMoveEventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    return window.removeEventListener(
      "pointerup",
      removePointerMoveEventListener
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onDragStop = (e, data) => {
    setBoxData({ ...boxData, x: data.x, y: data.y });
  };

  const onResizeStop = (e, direction, ref, delta, position) => {
    const originalWidth = parseInt(ref.style.width, 10);
    const originalHeight = parseInt(ref.style.height, 10);
    let newWidth = originalWidth;
    let newHeight = originalHeight;
    if (direction === "right" || direction === "left") {
      newWidth += delta.width;
      newHeight = newWidth / aspectRatio;
    } else if (direction === "bottom" || direction === "top") {
      newHeight += delta.height;
      newWidth = newHeight * aspectRatio;
    } else if (
      direction === "bottomRight" ||
      direction === "topLeft" ||
      direction === "bottomLeft" ||
      direction === "topRight"
    ) {
      if (Math.abs(delta.width) > Math.abs(delta.height)) {
        newWidth += delta.width;
        newHeight = newWidth / aspectRatio;
      } else {
        newHeight += delta.height;
        newWidth = newHeight * aspectRatio;
      }
    }
    setBoxData({
      ...boxData,
      width: newWidth,
      height: newHeight,
      ...position,
    });
  };

  const cropAndAppendVideo = () => {
    const { x, y, width, height } = boxData;
    const updatedTimings = [...allTimings];
    updatedTimings[index].crop = { x, y, width, height };
    setAllTimings(updatedTimings);
  };

  const addSubtitle = () => {
    const subtitleText = document.getElementById("subtitleText").value;
    const startTime = parseInt(document.getElementById("startTime").value, 10);
    const endTime = parseInt(document.getElementById("endTime").value, 10);
    const verticalPosition = parseInt(
      document.getElementById("subtitleVerticalPosition").value,
      10
    );
    const horizontalPosition = parseInt(
      document.getElementById("subtitleHorizontalPosition").value,
      10
    );
    const subtitleColor = document.getElementById("subtitleColor").value;
    const subtitleSize = parseInt(
      document.getElementById("subtitleSize").value,
      10
    );
    const videoContainer = document.querySelector(".video-section-save");
    const videoWidth = videoContainer.offsetWidth;
    const videoHeight = videoContainer.offsetHeight;
    const pixelTop = (verticalPosition / 100) * videoHeight;
    const pixelLeft = (horizontalPosition / 100) * videoWidth;
    const newSubtitle = {
      text: subtitleText,
      startTime,
      endTime,
      styles: {
        color: subtitleColor,
        fontSize: `${subtitleSize}px`,
        top: `${pixelTop}px`,
        left: `${pixelLeft}px`,
      },
    };
    setSubtitles([...subtitles, newSubtitle]);
  };

  const updateSubtitle = (currentTime) => {
    const subtitle = subtitles.find(
      (sub) => currentTime >= sub.startTime && currentTime <= sub.endTime
    );
    if (subtitle) {
      setCurrentSubtitle(subtitle.text);
      const subtitleElement = document.querySelector(".video-subtitle");
      Object.assign(subtitleElement.style, subtitle.styles);
    } else {
      setCurrentSubtitle("");
    }
  };

  const handleMouseMoveWhenGrabbed = (event) => {
    console.log("Function Triggered!");
    playVideoRef.current.pause();
    addActiveSegments();
    let playbackRect = playBackBarRef.current.getBoundingClientRect();
    console.log(playbackRect);
    let seekRatio = (event.clientX - playbackRect.left) / playbackRect.width;
    const index = currentlyGrabbedRef.current.index;
    const type = currentlyGrabbedRef.current.type;
    let time = timings;
    let seek = playVideoRef.current.duration * seekRatio;
    if (
      type === "start" &&
      seek > (index !== 0 ? time[index - 1].end + difference + 0.2 : 0) &&
      seek < time[index].end - difference
    ) {
      console.log("Entering start condition");
      progressBarRef.current.style.left = `${seekRatio * 100}%`;
      playVideoRef.current.currentTime = seek;
      time[index]["start"] = seek;
      setPlaying(false);
      setTimings(time);
    } else if (
      type === "end" &&
      seek > time[index].start + difference &&
      seek <
        (index !== timings.length - 1
          ? time[index].start - difference - 0.2
          : playVideoRef.current.duration)
    ) {
      progressBarRef.current.style.left = `${
        (time[index].start / playVideoRef.current.duration) * 100
      }%`;
      playVideoRef.current.currentTime = time[index].start;
      time[index]["end"] = seek;

      setPlaying(false);
      setTimings(time);
    }
    progressBarRef.current.style.width = "0%";
  };

  const removeMouseMoveEventListener = () => {
    window.removeEventListener("mousemove", handleMouseMoveWhenGrabbed);
  };

  const removePointerMoveEventListener = () => {
    window.removeEventListener("pointermove", handleMouseMoveWhenGrabbed);
  };

  const reset = () => {
    playVideoRef.current.pause();
    setIsMuted(false);
    setPlaying(false);
    currentlyGrabbedRef.current = { index: 0, type: "none" };
    setDifference(0.2);
    setDeletingGrabber(false);
    setCurrentWarning(false);
    setImageUrl("");
    setTimings([{ start: 0, end: playVideoRef.current.duration }]);
    playVideoRef.current.currentTime = timings[0].start;
    progressBarRef.current.style.left = `${
      (timings[0].start / playVideoRef.current.duration) * 100
    }%`;
    progressBarRef.current.style.width = "0%";
    addActiveSegments();
  };

  const captureSnapshot = () => {
    console.log(playVideoRef.current.currentTime);
    let video = playVideoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL();
    console.log("썸네일 시간 보내기");
    console.log(playVideoRef.current.currentTime);
    setImageUrl({ imageUrl: dataURL });
  };

  const downloadSnapshot = () => {
    let a = document.createElement("a");
    a.href = imageUrl;
    a.download = "Thumbnail.png"; //
    a.click();
  };

  const playPause = () => {
    if (playing) {
      playVideoRef.current.pause();
    } else {
      if (playVideoRef.current.currentTime >= timings[0].end) {
        playVideoRef.current.pause();
        setPlaying(false);
        currentlyGrabbedRef.current = { index: 0, type: "start" };
        playVideoRef.current.currentTime = timings[0].start;
        progressBarRef.current.style.left = `${
          (timings[0].start / playVideoRef.current.duration) * 100
        }%`;
        progressBarRef.current.style.width = "0%";
      }
      playVideoRef.current.play();
    }
    console.log("백으로 보내야할 사용할 동영상의 시간 부분");
    console.log(timings);
    console.log("보낼꺼");
    console.log(videos);
    setPlaying(!playing);
  };

  const updateProgress = (event) => {
    let playbackRect = playBackBarRef.current.getBoundingClientRect();
    let seekTime =
      ((event.clientX - playbackRect.left) / playbackRect.width) *
      playVideoRef.current.duration;
    playVideoRef.current.pause();
    let index = -1;
    let counter = 0;
    for (let times of timings) {
      if (seekTime >= times.start && seekTime <= times.end) {
        index = counter;
      }
      counter += 1;
    }
    if (index === -1) {
      return;
    }
    setPlaying(false);
    currentlyGrabbedRef.current = { index: index, type: "start" };
    progressBarRef.current.style.width = "0%";
    progressBarRef.current.style.left = `${
      (timings[index].start / playVideoRef.current.duration) * 100
    }%`;
    playVideoRef.current.currentTime = seekTime;
  };

  const addActiveSegments = () => {
    let colors = "";
    let counter = 0;
    colors += `, rgb(240, 240, 240) 0%, rgb(240, 240, 240) ${
      (timings[0].start / playVideoRef.current.duration) * 100
    }%`;
    for (let times of timings) {
      if (counter > 0) {
        colors += `, rgb(240, 240, 240) ${
          (timings[counter].end / playVideoRef.current.duration) * 100
        }%, rgb(240, 240, 240) ${
          (times.start / playVideoRef.current.duration) * 100
        }%`;
      }
      colors += `, #ccc ${
        (times.start / playVideoRef.current.duration) * 100
      }%, #ccc ${(times.end / playVideoRef.current.duration) * 100}%`;
      counter += 1;
    }
    colors += `, rgb(240, 240, 240) ${
      (timings[counter - 1].end / playVideoRef.current.duration) * 100
    }%, rgb(240, 240, 240) 100%`;
    playBackBarRef.current.style.background = `linear-gradient(to right${colors})`;
  };

  const saveVideo = async () => {
    try {
      const outputFiles = [];
      const trimmedVideos = [];

      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const trimStart = video.start;
        const trimEnd = video.end;

        const { x, y, width, height } = video.crop;
        const outputFileName = `output${i}.mp4`;

        const inputFiles = ffmpeg.current.FS("readdir", "/");
        console.log("Input files:", inputFiles);
        ffmpeg.current.FS(
          "writeFile",
          `input${i}.mp4`,
          await fetchFile(video.url)
        );
        const videoElement = document.querySelector(".video");
        const scaleX = videoElement.videoWidth / videoElement.clientWidth;
        const scaleY = videoElement.videoHeight / videoElement.clientHeight;

        const realX = Math.round(x * scaleX);
        const realY = Math.round(y * scaleY);
        const realWidth = Math.round(parseInt(width, 10) * scaleX);
        const realHeight = Math.round(parseInt(height, 10) * scaleY);
        await ffmpeg.current.run(
          "-i",
          `input${i}.mp4`,
          "-filter_complex",
          `[0:v]crop=${realWidth}:${realHeight}:${realX}:${realY},setpts=PTS-STARTPTS[v];[0:a]asetpts=PTS-STARTPTS[a]`,
          "-map",
          "[v]",
          "-map",
          "[a]",
          "-ss",
          trimStart.toString(),
          "-to",
          trimEnd.toString(),
          "-c:v",
          "libx264",
          "-preset",
          "fast",
          outputFileName
        );

        const data = ffmpeg.current.FS("readFile", outputFileName);
        const blob = new Blob([data.buffer], { type: "video/mp4" });
        const trimmedUrl = URL.createObjectURL(blob);
        trimmedVideos.push(trimmedUrl);
        outputFiles.push(outputFileName);
      }

      const concatList = outputFiles.map((file) => `file '${file}'`).join("\n");
      ffmpeg.current.FS(
        "writeFile",
        "concat.txt",
        new TextEncoder().encode(concatList)
      );

      await ffmpeg.current.run(
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "concat.txt",
        "-c",
        "copy",
        "finalOutput.mp4"
      );

      const finalData = ffmpeg.current.FS("readFile", "finalOutput.mp4");
      const finalUrl = URL.createObjectURL(
        new Blob([finalData.buffer], { type: "video/mp4" })
      );
      setTrimmedVideo(finalUrl);
      setTrimmingDone(true);

      console.log("Combined Video URL:", finalUrl);
      console.log("Trimmed Videos URLs:", trimmedVideos);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    if (trimmingDone) {
      console.log("trimmingDone is now true, component should update.");
    }
  }, [trimmingDone]);
  return (
    <div className="wrapper">
      <div className="container">
        {trimmingDone}
        {trimmingDone ? (
          <div className="video-section">
            <div className="video-section-save">
              <video
                className="video"
                autoPlay
                muted={isMuted}
                controlsList="nodownload"
                controls
                ref={playVideoRef}
                onLoadedData={playPause}
                onClick={playPause}
                onTimeUpdate={() => {
                  const currentTime = playVideoRef.current.currentTime;
                  setSeekerBar(progressBarRef.current.style.width);
                  updateSubtitle(currentTime);
                }}
                key={trimmedVideo}
              >
                <source src={trimmedVideo} type="video/mp4" />
              </video>
              <div className="video-subtitle">{currentSubtitle}</div>
            </div>
          </div>
        ) : (
          <div className="video-section">
            <video
              className="video"
              autoPlay="metadata"
              muted={isMuted}
              controlsList="nodownload"
              controls
              ref={playVideoRef}
              onLoadedData={playPause}
              onClick={playPause}
              onTimeUpdate={() =>
                setSeekerBar(progressBarRef.current.style.width)
              }
            >
              <source src={videoUrl} type="video/mp4" />
            </video>
            <Rnd
              size={{ width: boxData.width, height: boxData.height }}
              position={{ x: boxData.x, y: boxData.y }}
              onDragStop={onDragStop}
              onResizeStop={onResizeStop}
              lockAspectRatio={aspectRatio}
              style={{
                border: "solid 3px #FF3A3A ",
                background: "transparent",
              }}
            />
            <div className="video-subtitle" ref={subtitleRef}>
              {currentSubtitle}
            </div>
            <button onClick={cropAndAppendVideo}>Crop and Append Video</button>
          </div>
        )}
        {outputVideoUrl && (
          <div className="output-video-section">
            <video controls>
              <source src={outputVideoUrl} type="video/mp4" />
            </video>
          </div>
        )}

        <div className="input-section">
          <div className="subtitle-input">
            <input
              type="text"
              placeholder="Enter subtitle text"
              id="subtitleText"
            />
            <input type="number" placeholder="Start time (s)" id="startTime" />
            <input type="number" placeholder="End time (s)" id="endTime" />
            <input
              type="color"
              id="subtitleColor"
              placeholder="Subtitle Color"
            />
            <input
              type="number"
              id="subtitleSize"
              placeholder="Font Size (10-100)"
              min="10"
              max="100"
            />
            <input
              type="number"
              placeholder="Vertical Position (0-100)"
              id="subtitleVerticalPosition"
              min="0"
              max="100"
            />
            <input
              type="number"
              placeholder="Horizontal Position (0-100)"
              id="subtitleHorizontalPosition"
              min="0"
              max="100"
            />
            <button onClick={addSubtitle}> dd Subtitle</button>
          </div>
        </div>
      </div>

      <div className="playback">
        {playVideoRef.current
          ? Array.from(timings).map((timing, index) => (
              <div key={index}>
                <div key={"grabber_" + index}>
                  <div
                    id="grabberStart"
                    className="grabber start"
                    style={{
                      left: `${
                        (timing.start / playVideoRef.current.duration) * 100
                      }%`,
                    }}
                    onMouseDown={() => {
                      currentlyGrabbedRef.current = {
                        index: index,
                        type: "start",
                      };
                      window.addEventListener(
                        "mousemove",
                        handleMouseMoveWhenGrabbed
                      );
                      window.addEventListener(
                        "mouseup",
                        removeMouseMoveEventListener
                      );
                    }}
                    onPointerDown={() => {
                      currentlyGrabbedRef.current = {
                        index: index,
                        type: "start",
                      };
                      console.log(
                        "Currently grabbed (onMouseDown):",
                        currentlyGrabbedRef.current
                      );
                      window.addEventListener(
                        "pointermove",
                        handleMouseMoveWhenGrabbed
                      );
                      window.addEventListener(
                        "pointerup",
                        removePointerMoveEventListener
                      );
                    }}
                  >
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      x="0"
                      y="0"
                      width="10"
                      height="14"
                      viewBox="0 0 10 14"
                      xmlSpace="preserve"
                    >
                      <path
                        className="st0"
                        d="M1 14L1 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C2 13.6 1.6 14 1 14zM5 14L5 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C6 13.6 5.6 14 5 14zM9 14L9 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C10 13.6 9.6 14 9 14z"
                      />
                    </svg>
                  </div>
                  <div
                    id="grabberEnd"
                    className="grabber end"
                    style={{
                      left: `${
                        (timing.end / playVideoRef.current.duration) * 100
                      }%`,
                    }}
                    onMouseDown={(event) => {
                      currentlyGrabbedRef.current = {
                        index: index,
                        type: "end",
                      };
                      window.addEventListener(
                        "mousemove",
                        handleMouseMoveWhenGrabbed
                      );
                      window.addEventListener(
                        "mouseup",
                        removeMouseMoveEventListener
                      );
                    }}
                    onPointerDown={() => {
                      currentlyGrabbedRef.current = {
                        index: index,
                        type: "end",
                      };
                      window.addEventListener(
                        "pointermove",
                        handleMouseMoveWhenGrabbed
                      );
                      window.addEventListener(
                        "pointerup",
                        removePointerMoveEventListener
                      );
                    }}
                  >
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      x="0"
                      y="0"
                      width="10"
                      height="14"
                      viewBox="0 0 10 14"
                      xmlSpace="preserve"
                    >
                      <path
                        className="st0"
                        d="M1 14L1 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C2 13.6 1.6 14 1 14zM5 14L5 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C6 13.6 5.6 14 5 14zM9 14L9 14c-0.6 0-1-0.4-1-1V1c0-0.6 0.4-1 1-1h0c0.6 0 1 0.4 1 1v12C10 13.6 9.6 14 9 14z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          : []}
        <div
          className="seekable"
          ref={playBackBarRef}
          onClick={updateProgress}
        ></div>
        <div className="progress" ref={progressBarRef}></div>
      </div>

      <div className="controls">
        <div className="player-controls">
          <button
            className="settings-control"
            title="Reset Video"
            onClick={reset}
          >
            <FontAwesomeIcon icon={faSync} />
          </button>
          <button
            className="settings-control"
            title="Mute/Unmute Video"
            onClick={() => setIsMuted({ isMuted: !isMuted })}
          >
            {isMuted ? (
              <FontAwesomeIcon icon={faVolumeMute} />
            ) : (
              <FontAwesomeIcon icon={faVolumeUp} />
            )}
          </button>
          <button
            className="settings-control"
            title="Capture Thumbnail"
            onClick={captureSnapshot}
          >
            <FontAwesomeIcon icon={faCamera} />
          </button>
        </div>
        <div className="player-controls">
          <button
            className="play-control"
            title="Play/Pause"
            onClick={playPause}
          >
            {playing ? (
              <FontAwesomeIcon icon={faPause} />
            ) : (
              <FontAwesomeIcon icon={faPlay} />
            )}
          </button>
        </div>

        <div>
          <button
            title="Save changes"
            className="trim-control"
            onClick={saveVideo}
          >
            Save
          </button>

          <button
            onClick={() => {
              const updatedTimings = allTimings.filter(
                (_, idx) => idx !== index
              );
              setAllTimings(updatedTimings);
              setIsAdding(true);
            }}
          >
            Add Another Video
          </button>
        </div>
      </div>
      {ready ? <div></div> : <div>Loading...</div>}
      {currentWarning != null ? (
        <div className={"warning"}>{warnings[currentWarning]}</div>
      ) : (
        ""
      )}
      {imageUrl !== "" ? (
        <div className={"marginVertical"}>
          <img src={imageUrl} className={"thumbnail"} alt="Photos" />
          <div className="controls">
            <div className="player-controls">
              <button
                className="settings-control"
                title="Reset Video"
                onClick={downloadSnapshot}
              >
                <FontAwesomeIcon icon={faDownload} />
              </button>
              <button
                className="settings-control"
                title="Save Video"
                onClick={() => {
                  setImageUrl("");
                }}
              >
                <FontAwesomeIcon icon={faEraser} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}

export default Editor;
