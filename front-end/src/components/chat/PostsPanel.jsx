import { useEffect, useRef, useState } from "react";
import { ImagePlusIcon, LoaderIcon, MessageCircleIcon, Trash2Icon, MicIcon, SquareIcon } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";

export function PostsPanel() {
  const authUser = useAuthStore((state) => state.authUser);
  const socket = useAuthStore((state) => state.socket);
  const setActiveConversationId = useChatStore((state) => state.setActiveConversationId);
  const setWorkspaceSection = useChatStore((state) => state.setWorkspaceSection);
  const setComposerPostReply = useChatStore((state) => state.setComposerPostReply);
  const sendMediaMessage = useChatStore((state) => state.sendMediaMessage);
  const [recordingPostId, setRecordingPostId] = useState(null);
  const recorderRef = useRef(null);
  const fileInput = useRef(null);
  const [posts, setPosts] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    axiosInstance
      .get("/posts")
      .then((res) => setPosts(res.data))
      .catch((error) => toast.error(error.response?.data?.message || "Could not load posts"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handlePost = (post) => {
      setPosts((items) =>
        items.some((item) => String(item._id) === String(post._id))
          ? items
          : [post, ...items],
      );
    };
    const handleDelete = ({ postId }) =>
      setPosts((items) => items.filter((item) => String(item._id) !== String(postId)));
    const handleUserUpdated = (user) => setPosts((items) => items.map((post) => String(post.userId?._id) === String(user._id) ? { ...post, userId: { ...post.userId, ...user } } : post));
    socket.on("newPost", handlePost);
    socket.on("deletePost", handleDelete);
    socket.on("userUpdated", handleUserUpdated);
    return () => {
      socket.off("newPost", handlePost);
      socket.off("deletePost", handleDelete);
      socket.off("userUpdated", handleUserUpdated);
    };
  }, [socket]);

  const submitPost = async (event) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a photo or video first");
      return;
    }
    const formData = new FormData();
    formData.append("media", file);
    formData.append("caption", caption);
    setIsPosting(true);
    try {
      const res = await axiosInstance.post("/posts", formData);
      setPosts((items) =>
        items.some((item) => String(item._id) === String(res.data._id))
          ? items
          : [res.data, ...items],
      );
      setFile(null);
      setCaption("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not publish post");
    } finally {
      setIsPosting(false);
    }
  };

  const deletePost = async (postId) => {
    try {
      await axiosInstance.delete(`/posts/${postId}`);
      setPosts((items) => items.filter((post) => String(post._id) !== String(postId)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete post");
    }
  };

  const makePostReply = (post) => ({ postId: post._id, mediaUrl: post.mediaUrl || "", mediaType: post.mediaType, caption: post.caption || "", quoteText: post.quoteText || "", quoteAuthor: post.quoteAuthor || "", authorName: post.userId?.fullName || "Chat user" });

  const recordPostReply = async (peerId, post) => {
    if (recordingPostId) { recorderRef.current?.stop(); setRecordingPostId(null); return; }
    try {
      setActiveConversationId(peerId);
      setComposerPostReply(makePostReply(post));
      setWorkspaceSection("chat");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (chunks.length) await sendMediaMessage({ conversationId: peerId, file: new File(chunks, `post-voice-reply-${Date.now()}.webm`, { type: recorder.mimeType || "audio/webm" }) });
      };
      recorder.start(); setRecordingPostId(String(post._id));
    } catch { toast.error("Allow microphone access to record a voice reply"); }
  };

  return (
    <section className="mx-auto w-full max-w-3xl p-4 sm:p-6" aria-label="Posts">
      <h1 className="text-xl font-semibold">Posts</h1>
      <p className="mt-1 text-sm text-muted">Photos, videos, and quotes disappear after 24 hours.</p>

      <form onSubmit={submitPost} className="mt-5 rounded-2xl border border-border bg-background p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
            {authUser?.fullName?.slice(0, 1).toUpperCase() || "Y"}
          </div>
          <div className="min-w-0 flex-1">
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Share a moment…"
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            {file ? (
              <p className="mt-2 truncate text-xs text-muted">{file.name}</p>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-2">
              <input
                ref={fileInput}
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent/10"
              >
                <ImagePlusIcon className="size-4" />
                Photo / video
              </button>
              <button
                type="submit"
                disabled={isPosting || !file}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-50"
              >
                {isPosting ? <LoaderIcon className="size-4 animate-spin" /> : "Post"}
              </button>
            </div>
          </div>
        </div>
      </form>

      <div className="mt-5 space-y-4">
        {isLoading ? <p className="py-8 text-center text-sm text-muted">Loading posts…</p> : null}
        {!isLoading && posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
            Nothing posted yet. Share the first photo or video.
          </p>
        ) : null}
        {posts.map((post) => (
          <article key={post._id} className="overflow-hidden rounded-2xl border border-border bg-background">
            <header className="flex items-center gap-2 px-3 py-3 sm:px-4">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                {post.userId?.fullName?.slice(0, 1).toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{post.userId?.fullName || "Chat user"}</p>
              <time className="text-[10px] text-muted">{new Date(post.createdAt).toLocaleString()}</time>
              </div>
              {String(post.userId?._id) !== String(authUser?._id) ? (
                <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setActiveConversationId(post.userId._id);
                    setComposerPostReply(makePostReply(post));
                    setWorkspaceSection("chat");
                  }}
                  className="grid size-9 place-items-center rounded-lg text-accent hover:bg-accent/10"
                  aria-label={`Reply to ${post.userId?.fullName || "user"}'s post in chat`}
                  title="Reply in chat"
                >
                  <MessageCircleIcon className="size-5" />
                </button>
                <button type="button" aria-label={recordingPostId === String(post._id) ? "Stop and send voice reply" : "Record voice reply"} onClick={() => recordPostReply(post.userId._id, post)} className={`grid size-9 place-items-center rounded-full ${recordingPostId === String(post._id) ? "bg-accent text-accent-foreground" : "text-accent hover:bg-accent/10"}`}>{recordingPostId === String(post._id) ? <SquareIcon className="size-4" /> : <MicIcon className="size-4" />}</button>
                </div>
              ) : null}
              {String(post.userId?._id) === String(authUser?._id) ? (
                <button
                  type="button"
                  onClick={() => deletePost(post._id)}
                  className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-danger"
                  aria-label="Delete post"
                >
                  <Trash2Icon className="size-4" />
                </button>
              ) : null}
            </header>
            {post.mediaType === "quote" ? (
              <blockquote className="bg-accent/5 px-6 py-10 text-center sm:px-12">
                <p className="text-2xl font-semibold leading-relaxed text-foreground">“{post.quoteText}”</p>
                {post.quoteAuthor ? <cite className="mt-4 block text-sm not-italic text-muted">— {post.quoteAuthor}</cite> : null}
              </blockquote>
            ) : post.mediaType === "video" ? (
              <video src={post.mediaUrl} controls playsInline className="max-h-[65vh] w-full bg-black object-contain" />
            ) : (
              <img src={post.mediaUrl} alt={post.caption || "Photo post"} className="max-h-[65vh] w-full bg-black object-contain" />
            )}
            {post.caption ? <p className="whitespace-pre-wrap px-4 py-3 text-sm">{post.caption}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
