import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let ringTimeout;

function makePeerConnection(callId, peerId, stream, set, get) {
  const socket = useAuthStore.getState().socket;
  const connection = new RTCPeerConnection(rtcConfig);
  stream.getTracks().forEach((track) => connection.addTrack(track, stream));
  connection.ontrack = (event) => {
    set({ remoteStream: event.streams[0] || null });
  };
  connection.onicecandidate = (event) => {
    if (event.candidate) {
      socket?.emit("call:ice", {
        callId,
        toUserId: peerId,
        candidate: event.candidate.toJSON(),
      });
    }
  };
  connection.onconnectionstatechange = () => {
    if (connection.connectionState === "failed") {
      toast.error("The call connection failed. Try again on a different network.");
      get().finishCall("ended");
    }
  };
  set({ peerConnection: connection });
  return connection;
}

async function applyQueuedCandidates(connection, candidates) {
  for (const candidate of candidates) {
    try {
      await connection.addIceCandidate(candidate);
    } catch {
      // Ignore candidates that became invalid while a peer disconnected.
    }
  }
}

export const useCallStore = create((set, get) => ({
  activeCall: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  pendingCandidates: [],
  isMuted: false,

  startCall: async (peer, callType) => {
    const socket = useAuthStore.getState().socket;
    if (!peer?._id || !socket?.connected) {
      toast.error("Connect to the chat server before calling");
      return;
    }
    if (get().activeCall) {
      toast.error("Finish your current call first");
      return;
    }

    let stream;
    try {
      const eligibility = await axiosInstance.get(`/calls/eligibility/${peer._id}`);
      if (!eligibility.data.eligible) {
        toast.error("Calls unlock after you both have chatted on 3 separate days over 3 days.");
        return;
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      const response = await axiosInstance.post("/calls", {
        peerId: peer._id,
        callType,
      });
      const call = response.data;
      const activeCall = {
        id: call._id,
        peerId: peer._id,
        peerName: peer.fullName,
        callType,
        incoming: false,
        status: "ringing",
        startedAt: Date.now(),
      };
      set({ activeCall, localStream: stream, remoteStream: null, pendingCandidates: [] });

      const connection = makePeerConnection(call._id, peer._id, stream, set, get);
      const offer = await connection.createOffer();
      socket.emit("call:invite", {
        callId: call._id,
        toUserId: peer._id,
        fromName: peer.fullName,
        callType,
        offer,
      });
      await connection.setLocalDescription(offer);
      ringTimeout = window.setTimeout(() => {
        if (get().activeCall?.id === call._id && get().activeCall?.status === "ringing") {
          get().finishCall("missed");
        }
      }, 45_000);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (error.response?.data?.message) toast.error(error.response.data.message);
      else toast.error("Allow microphone/camera access to start a call");
      set({ activeCall: null, localStream: null, peerConnection: null });
    }
  },

  receiveIncomingCall: (payload) => {
    if (get().activeCall) {
      useAuthStore.getState().socket?.emit("call:decline", {
        callId: payload.callId,
        toUserId: payload.fromUserId,
      });
      return;
    }
    set({
      activeCall: {
        id: payload.callId,
        peerId: payload.fromUserId,
        peerName: payload.fromName,
        callType: payload.callType,
        incoming: true,
        status: "ringing",
        offer: payload.offer,
        startedAt: Date.now(),
      },
      pendingCandidates: [],
    });
  },

  acceptCall: async () => {
    const call = get().activeCall;
    if (!call?.incoming || !call.offer) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.callType === "video",
      });
      const connection = makePeerConnection(call.id, call.peerId, stream, set, get);
      await connection.setRemoteDescription(call.offer);
      await applyQueuedCandidates(connection, get().pendingCandidates);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      await axiosInstance.patch(`/calls/${call.id}/accept`);
      set({
        localStream: stream,
        activeCall: { ...call, status: "answered" },
        pendingCandidates: [],
      });
      useAuthStore.getState().socket?.emit("call:answer", {
        callId: call.id,
        toUserId: call.peerId,
        answer: connection.localDescription.toJSON(),
      });
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      toast.error(error.response?.data?.message || "Could not join the call");
      await get().finishCall("declined");
    }
  },

  receiveAnswer: async (payload) => {
    const { activeCall, peerConnection, pendingCandidates } = get();
    if (!activeCall || activeCall.id !== payload.callId || !peerConnection) return;
    await peerConnection.setRemoteDescription(payload.answer);
    await applyQueuedCandidates(peerConnection, pendingCandidates);
    set({
      pendingCandidates: [],
      activeCall: { ...activeCall, status: "answered" },
    });
    window.clearTimeout(ringTimeout);
  },

  receiveCandidate: async (payload) => {
    const { activeCall, peerConnection, pendingCandidates } = get();
    if (!activeCall || activeCall.id !== payload.callId) return;
    if (!peerConnection?.remoteDescription) {
      set({ pendingCandidates: [...pendingCandidates, payload.candidate] });
      return;
    }
    try {
      await peerConnection.addIceCandidate(payload.candidate);
    } catch {
      // Candidates can arrive as the connection is closing.
    }
  },

  finishCall: async (status = "ended", notifyPeer = true) => {
    const { activeCall, peerConnection, localStream } = get();
    if (!activeCall) return;
    window.clearTimeout(ringTimeout);
    if (notifyPeer) {
      useAuthStore.getState().socket?.emit(
        status === "declined" ? "call:decline" : "call:end",
        { callId: activeCall.id, toUserId: activeCall.peerId },
      );
    }
    peerConnection?.close();
    localStream?.getTracks().forEach((track) => track.stop());
    set({
      activeCall: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      pendingCandidates: [],
      isMuted: false,
    });
    try {
      await axiosInstance.patch(`/calls/${activeCall.id}/finish`, { status });
    } catch (error) {
      console.error("Could not save call history", error.message);
    }
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    const nextMuted = !isMuted;
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    set({ isMuted: nextMuted });
  },

  registerCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("call:incoming");
    socket.off("call:answer");
    socket.off("call:ice");
    socket.off("call:decline");
    socket.off("call:end");
    socket.on("call:incoming", get().receiveIncomingCall);
    socket.on("call:answer", get().receiveAnswer);
    socket.on("call:ice", get().receiveCandidate);
    socket.on("call:decline", () => get().finishCall("declined", false));
    socket.on("call:end", () => get().finishCall("ended", false));
  },

  unregisterCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    socket?.off("call:incoming");
    socket?.off("call:answer");
    socket?.off("call:ice");
    socket?.off("call:decline");
    socket?.off("call:end");
  },
}));
