/* eslint-disable func-names */
import { useState, useEffect } from "react";
import { FileDrop } from "react-file-drop"; // https://github.com/sarink/react-file-drop
import "../editor.css";
import Editor from "./Editor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"; // https://fontawesome.com/v5/docs/web/use-with/react
import { faLightbulb, faMoon } from "@fortawesome/free-solid-svg-icons"; // https://fontawesome.com/v5/docs/web/use-with/react

function VideoEditor() {
  //Boolean state handling whether upload has occured or not
  const [isUpload, setIsUpload] = useState(true);

  //State handling storing of the video
  const [videoUrl, setVideoUrl] = useState("");
  const [videoBlob, setVideoBlob] = useState("");

  //Boolean state handling whether light or dark mode has been chosen
  const [isDarkMode, setIsDarkMode] = useState(false);

  //Stateful array handling storage of the start and end times of videos
  const [timings, setTimings] = useState([]);

  // 추가
  const [allTimings, setAllTimings] = useState([]);
  const [isAdding, setIsAdding] = useState(true);
  const [videos, setVideos] = useState([]);
  //Lifecycle handling light and dark themes
  useEffect(() => {
    toggleThemes();
    document.addEventListener("drop", function (e) {
      e.preventDefault();
      e.stopPropagation();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Function handling file input as well as file drop library and rendering of those elements
  const renderUploader = () => {
    return (
      <div className={"wrapper"}>
        <input
          onChange={(e) => uploadFile(e.target.files)}
          type="file"
          className="hidden"
          id="up_file"
        />
        <FileDrop
          onDrop={(e) => uploadFile(e)}
          onTargetClick={() => document.getElementById("up_file").click()}
        >
          Click or drop your video here to edit!
        </FileDrop>
      </div>
    );
  };

  //Function handling the light and dark themes logic
  const toggleThemes = () => {
    if (isDarkMode) {
      document.body.style.backgroundColor = "#1f242a";
      document.body.style.color = "#fff";
    }
    if (!isDarkMode) {
      document.body.style.backgroundColor = "#fff";
      document.body.style.color = "#1f242a";
    }
    setIsDarkMode(!isDarkMode);
  };

  //Function handling the file upload file logic
  const uploadFile = async (fileInput) => {
    console.log(fileInput[0]);
    let fileUrl = URL.createObjectURL(fileInput[0]);
    setIsUpload(false);
    setVideoUrl(fileUrl);
    setVideoBlob(fileInput[0]);
    const newVideo = {
      videoUrl: fileUrl,
      videoBlob: fileInput[0],
      timings: [],
    };
    setAllTimings([...allTimings, newVideo]);
    setIsAdding(false); // 파일이 추가되면 편집 상태로 전환
  };
  const handleAddVideo = () => {
    const currentVideo = allTimings[allTimings.length - 1];
    if (currentVideo.timings.length > 0) {
      const newVideo = {
        url: currentVideo.videoUrl,
        start: currentVideo.timings[0].start,
        end: currentVideo.timings[0].end,
        crop: currentVideo.crop, // crop 정보도 추가
      };
      setVideos((prevVideos) => [...prevVideos, newVideo]);
    }
  };

  return (
    <div>
      {isAdding
        ? renderUploader()
        : allTimings.map((video, index) => (
            <Editor
              key={index}
              index={index}
              videoUrl={video.videoUrl}
              videoBlob={video.videoBlob}
              timings={video.timings}
              setTimings={(newTimings) => {
                const updatedTimings = [...allTimings];
                updatedTimings[index].timings = newTimings;
                setAllTimings(updatedTimings);
              }}
              setIsAdding={setIsAdding}
              videos={videos}
              setVideos={setVideos}
              setAllTimings={setAllTimings}
              allTimings={allTimings}
            />
          ))}
      <button onClick={handleAddVideo}>Add Video</button>
    </div>
  );
}

export default VideoEditor;
