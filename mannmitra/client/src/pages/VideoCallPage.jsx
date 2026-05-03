import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../services/api";
import { useLocation } from "react-router-dom";

const socket = io("http://localhost:5000");

export default function VideoCallPage() {
  const location = useLocation();
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [mediaError, setMediaError] = useState("");
  const [connState, setConnState] = useState("new");
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const pcRef = useRef(null);
  const streamRef = useRef(null);
  const syntheticTimerRef = useRef(null);

  const createSyntheticVideoStream = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d");
    let tick = 0;
    syntheticTimerRef.current = window.setInterval(() => {
      tick += 1;
      ctx.fillStyle = tick % 2 === 0 ? "#0f172a" : "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(0, 0, canvas.width, 48);
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("Mannmitra Virtual Camera", 16, 31);
      ctx.fillStyle = "#ffffff";
      ctx.font = "18px sans-serif";
      ctx.fillText(
        `No physical camera detected - fallback video active (${tick})`,
        16,
        90,
      );
      ctx.fillText(new Date().toLocaleTimeString(), 16, 130);
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect((tick * 8) % canvas.width, 170, 60, 8);
    }, 200);
    return canvas.captureStream(10);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const room = params.get("room");
    if (room) setRoomId(room);
  }, [location.search]);

  const loadVideoDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(cams);
      if (!selectedVideoDeviceId && cams[0]?.deviceId) {
        setSelectedVideoDeviceId(cams[0].deviceId);
      }
    } catch (_e) {}
  };

  useEffect(() => {
    loadVideoDevices();
  }, []);

  useEffect(() => {
    socket.on("joined-room", async ({ peerCount }) => {
      if (!pcRef.current) return;
      // Only the already-joined peer should create offer on "peer-joined".
      // New joiner waits for incoming offer to avoid glare collisions.
      setStatus(
        peerCount > 1
          ? "Joined room. Waiting for host offer..."
          : "Joined room. Waiting for other participant...",
      );
    });
    socket.on("peer-joined", async () => {
      if (!pcRef.current) return;
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
      setStatus("Peer joined, offer sent");
    });
    socket.on("offer", async ({ offer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("answer", { roomId, answer });
      setStatus("Offer received, answer sent");
    });
    socket.on("answer", async ({ answer }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(answer);
      setStatus("Connected");
    });
    socket.on("ice-candidate", async ({ candidate }) => {
      if (candidate && pcRef.current)
        await pcRef.current.addIceCandidate(candidate);
    });
    return () => {
      socket.off("peer-joined");
      socket.off("joined-room");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, [roomId]);
  const init = async () => {
    setMediaError("");
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    try {
      let stream = null;
      let usedMode = "video+audio";
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            ...(selectedVideoDeviceId
              ? { deviceId: { exact: selectedVideoDeviceId } }
              : {}),
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (_firstErr) {
        try {
          usedMode = "video-only";
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              ...(selectedVideoDeviceId
                ? { deviceId: { exact: selectedVideoDeviceId } }
                : {}),
            },
            audio: false,
          });
          setMicOn(false);
        } catch (_secondErr) {
          try {
            usedMode = "audio-only";
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            setCameraOn(false);
          } catch (_thirdErr) {
            usedMode = "screen-share-fallback";
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: false,
            });
            setMicOn(false);
            setCameraOn(true);
          }
        }
      }
      streamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
      try {
        if (localRef.current) await localRef.current.play();
      } catch (_e) {}
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      setStatus(`Media ready (${usedMode}). Joined room.`);
    } catch (err) {
      // Publish synthetic fallback video so call still has visible media.
      setMicOn(false);
      const syntheticStream = createSyntheticVideoStream();
      const syntheticVideoTrack = syntheticStream.getVideoTracks()[0];
      streamRef.current = syntheticStream;
      if (localRef.current) {
        localRef.current.srcObject = syntheticStream;
      }
      if (syntheticVideoTrack) {
        pc.addTrack(syntheticVideoTrack, syntheticStream);
        setCameraOn(true);
      } else {
        setCameraOn(false);
        pc.addTransceiver("video", { direction: "recvonly" });
      }
      pc.addTransceiver("audio", { direction: "recvonly" });
      setMediaError(
        (err?.message || "Camera/microphone unavailable") +
          ". Switched to virtual fallback video mode.",
      );
      setStatus("Joined room in fallback video mode");
    }

    pc.ontrack = async (e) => {
      remoteRef.current.srcObject = e.streams[0];
      try {
        await remoteRef.current.play();
      } catch (_playError) {
        setStatus("Remote stream received. Tap video once to unmute/play.");
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate)
        socket.emit("ice-candidate", { roomId, candidate: e.candidate });
    };
    pc.onconnectionstatechange = () => {
      setConnState(pc.connectionState || "unknown");
      if (pc.connectionState === "connected") {
        setStatus("Connected");
      }
    };
  };

  const createRoom = async () => {
    const { data } = await api.post("/video/room");
    setRoomId(data.roomId);
    setStatus("Room created. Share room ID and join.");
  };

  const join = async () => {
    if (!roomId.trim()) return;
    try {
      await api.get(`/video/join/${encodeURIComponent(roomId)}`);
    } catch (_e) {
      setStatus("Meeting code invalid or meeting already completed");
      return;
    }
    await init();
    socket.emit("join-room", roomId);
    setJoined(true);
    setStatus("Joined room");
  };
  const renegotiateIfNeeded = async () => {
    if (!pcRef.current || !joined) return;
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socket.emit("offer", { roomId, offer });
  };

  const tc = async () => {
    const currentTrack = streamRef.current?.getVideoTracks?.()[0];
    if (currentTrack) {
      currentTrack.enabled = !currentTrack.enabled;
      setCameraOn(currentTrack.enabled);
      setStatus(currentTrack.enabled ? "Camera enabled" : "Camera disabled");
      return;
    }

    try {
      if (videoDevices.length === 0) {
        setMediaError("No physical camera detected on this system.");
        return;
      }
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(selectedVideoDeviceId
            ? { deviceId: { exact: selectedVideoDeviceId } }
            : {}),
        },
        audio: false,
      });
      const newVideoTrack = camStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      if (!streamRef.current) {
        streamRef.current = new MediaStream();
      }
      streamRef.current.addTrack(newVideoTrack);

      if (localRef.current) {
        localRef.current.srcObject = streamRef.current;
        try {
          await localRef.current.play();
        } catch (_e) {}
      }

      if (pcRef.current) {
        const sender = pcRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        } else {
          pcRef.current.addTrack(newVideoTrack, streamRef.current);
          await renegotiateIfNeeded();
        }
      }

      setCameraOn(true);
      setMediaError("");
      setStatus("Camera enabled");
    } catch (err) {
      // If camera hardware is unavailable, inject synthetic video track.
      const syntheticStream = createSyntheticVideoStream();
      const syntheticTrack = syntheticStream.getVideoTracks()[0];
      if (syntheticTrack) {
        if (!streamRef.current) {
          streamRef.current = new MediaStream();
        }
        streamRef.current.addTrack(syntheticTrack);
        if (localRef.current) {
          localRef.current.srcObject = streamRef.current;
        }
        if (pcRef.current) {
          const sender = pcRef.current
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            await sender.replaceTrack(syntheticTrack);
          } else {
            pcRef.current.addTrack(syntheticTrack, streamRef.current);
            await renegotiateIfNeeded();
          }
        }
        setCameraOn(true);
        setMediaError("No physical camera found. Virtual camera enabled.");
        setStatus("Virtual camera enabled");
      } else {
        setMediaError(
          err?.message ||
            "Camera could not be enabled. Check permissions/device.",
        );
      }
    }
  };
  const tm = () => {
    const t = streamRef.current?.getAudioTracks()[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setMicOn(t.enabled);
  };
  const leave = () => {
    socket.emit("leave-room", roomId);
    pcRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setJoined(false);
    setStatus("Call ended");
    if (syntheticTimerRef.current) {
      window.clearInterval(syntheticTimerRef.current);
      syntheticTimerRef.current = null;
    }
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-wellness-sage">
        Video
      </p>
      <h2 className="mt-2 mm-heading md:text-3xl">Live video consultancy</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="mm-input min-w-[12rem] flex-1"
          placeholder="Enter room id"
        />
        {!roomId ? (
          <button
            type="button"
            onClick={createRoom}
            className="mm-btn-secondary"
          >
            Create Room
          </button>
        ) : null}
        <button type="button" onClick={join} className="mm-btn-primary">
          Join Room
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <select
          value={selectedVideoDeviceId}
          onChange={(e) => setSelectedVideoDeviceId(e.target.value)}
          className="mm-input max-w-xs"
        >
          {videoDevices.length === 0 ? (
            <option value="">No camera detected</option>
          ) : (
            videoDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))
          )}
        </select>
        <button
          type="button"
          onClick={loadVideoDevices}
          className="mm-btn-secondary text-xs py-1.5"
        >
          Refresh Cameras
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-400">{status}</p>
      <p className="mt-1 text-xs text-slate-500">Connection: {connState}</p>
      {mediaError ? (
        <p className="mt-1 text-sm text-red-400">{mediaError}</p>
      ) : null}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <video
          ref={localRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-xl bg-black"
        />
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="w-full rounded-xl bg-black"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={tc} className="mm-btn-secondary">
          Camera: {cameraOn ? "On" : "Off"}
        </button>
        <button type="button" onClick={tm} className="mm-btn-secondary">
          Mic: {micOn ? "On" : "Off"}
        </button>
        <button type="button" onClick={leave} className="mm-btn-danger">
          End Call
        </button>
      </div>
    </div>
  );
}
