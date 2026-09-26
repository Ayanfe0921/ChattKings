import { useEffect, useRef } from "react";
import { MicIcon, MicOffIcon, PhoneCallIcon, PhoneOffIcon, VideoIcon } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useCallStore } from "../../store/useCallStore";

export function CallOverlay() {
  const socket = useAuthStore((state) => state.socket);
  const activeCall = useCallStore((state) => state.activeCall);
  const localStream = useCallStore((state) => state.localStream);
  const remoteStream = useCallStore((state) => state.remoteStream);
  const isMuted = useCallStore((state) => state.isMuted);
  const registerCallEvents = useCallStore((state) => state.registerCallEvents);
  const unregisterCallEvents = useCallStore((state) => state.unregisterCallEvents);
  const acceptCall = useCallStore((state) => state.acceptCall);
  const finishCall = useCallStore((state) => state.finishCall);
  const toggleMute = useCallStore((state) => state.toggleMute);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);

  useEffect(() => {
    registerCallEvents();
    return () => unregisterCallEvents();
  }, [socket, registerCallEvents, unregisterCallEvents]);

  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = localStream;
    if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
    if (remoteAudio.current) {
      remoteAudio.current.srcObject =
        activeCall?.callType === "voice" ? remoteStream : null;
    }
  }, [localStream, remoteStream, activeCall?.callType]);

  if (!activeCall) return null;
  const isIncoming = activeCall.incoming && activeCall.status === "ringing";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-background text-foreground shadow-2xl">
        {isIncoming ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-accent/15 text-accent">
              {activeCall.callType === "video" ? <VideoIcon className="size-9" /> : <PhoneCallIcon className="size-9" />}
            </div>
            <h2 className="mt-4 text-xl font-semibold">{activeCall.peerName}</h2>
            <p className="mt-1 text-sm capitalize text-muted">Incoming {activeCall.callType} call</p>
            <div className="mt-7 flex justify-center gap-5">
              <button
                type="button"
                onClick={() => finishCall("declined")}
                className="grid size-14 place-items-center rounded-full bg-danger text-white"
                aria-label="Decline call"
              >
                <PhoneOffIcon className="size-6" />
              </button>
              <button
                type="button"
                onClick={acceptCall}
                className="grid size-14 place-items-center rounded-full bg-success text-white"
                aria-label="Accept call"
              >
                <PhoneCallIcon className="size-6" />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative min-h-80 bg-zinc-950 text-white">
            {activeCall.callType === "video" && remoteStream ? (
              <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 size-full object-cover" />
            ) : (
              <div className="grid min-h-80 place-items-center text-center">
                <div>
                  <div className="mx-auto grid size-20 place-items-center rounded-full bg-white/10 text-3xl font-semibold">
                    {activeCall.peerName?.slice(0, 1).toUpperCase()}
                  </div>
                  <p className="mt-4 text-lg font-semibold">{activeCall.peerName}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {activeCall.status === "ringing" ? "Calling…" : "Connected"}
                  </p>
                </div>
              </div>
            )}
            <audio ref={remoteAudio} autoPlay />
            {activeCall.callType === "video" && localStream ? (
              <video ref={localVideo} autoPlay muted playsInline className="absolute bottom-4 right-4 aspect-video w-28 rounded-xl border border-white/30 object-cover sm:w-36" />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-linear-to-t from-black/80 to-transparent px-4 pb-5 pt-12">
              <button
                type="button"
                onClick={toggleMute}
                className="grid size-12 place-items-center rounded-full bg-white/15 hover:bg-white/25"
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? <MicOffIcon className="size-5" /> : <MicIcon className="size-5" />}
              </button>
              <button
                type="button"
                onClick={() => finishCall("ended")}
                className="grid size-14 place-items-center rounded-full bg-danger text-white"
                aria-label="End call"
              >
                <PhoneOffIcon className="size-6" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
