import { useEffect, useRef, useState } from "react";
import { ImagePlusIcon, LoaderIcon, MessageCircleIcon, Trash2Icon, MicIcon, SquareIcon, HeartIcon, UserRoundIcon } from "lucide-react";
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
  const ownerLikeClickTimer = useRef(null);
  const fileInput = useRef(null);
  const [posts, setPosts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("chattkings-seen-posts") || "[]"); } catch { return []; }
  });
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [isLoading, setIsLoading] = useState(() => navigator.onLine);
  const [isPosting, setIsPosting] = useState(false);
  const [likesForPost, setLikesForPost] = useState(null);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);

  const formatLikeCount = (count = 0) => {
    if (count >= 999_950) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}m`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
    return String(count);
  };

  useEffect(() => () => clearTimeout(ownerLikeClickTimer.current), []);

  useEffect(() => {
    if (!navigator.onLine) return;
    axiosInstance
      .get("/posts")
      .then((res) => setPosts(res.data))
      .catch((error) => toast.error(error.response?.data?.message || "Could not load posts"))
      .finally(() => setIsLoading(false));
  }, []);

  const cacheViewedPost = (element, post) => {
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      let cached = [];
      try { cached = JSON.parse(localStorage.getItem("chattkings-seen-posts") || "[]"); } catch {}
      if (!cached.some((item) => String(item._id) === String(post._id))) {
        try { localStorage.setItem("chattkings-seen-posts", JSON.stringify([post, ...cached].slice(0, 50))); } catch {}
      }
      observer.disconnect();
    }, { threshold: 0.35 });
    observer.observe(element);
  };

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
    const handleLikesUpdated = ({ postId, likeCount, actorId, likedByMe }) => setPosts((items) => items.map((post) => String(post._id) === String(postId) ? { ...post, likeCount, ...(String(actorId) === String(authUser?._id) ? { likedByMe } : {}) } : post));
    socket.on("newPost", handlePost);
    socket.on("deletePost", handleDelete);
    socket.on("userUpdated", handleUserUpdated);
    socket.on("postLikesUpdated", handleLikesUpdated);
    return () => {
      socket.off("newPost", handlePost);
      socket.off("deletePost", handleDelete);
      socket.off("userUpdated", handleUserUpdated);
      socket.off("postLikesUpdated", handleLikesUpdated);
    };
  }, [socket, authUser?._id]);

  const toggleLike = async (post) => {
    if (!navigator.onLine) return toast.error("Connect to the internet to like posts");
    try {
      const { data } = await axiosInstance.post(`/posts/${post._id}/like`);
      setPosts((items) => items.map((item) => String(item._id) === String(post._id) ? { ...item, ...data } : item));
    } catch (error) { toast.error(error.response?.data?.message || "Could not like post"); }
  };

  const showPostLikes = async (post) => {
    setLikesForPost({ post, users: [] });
    setIsLoadingLikes(true);
    try {
      const { data } = await axiosInstance.get(`/posts/${post._id}/likes`);
      setLikesForPost({ post, users: data });
    } catch (error) { setLikesForPost(null); toast.error(error.response?.data?.message || "Could not load likes"); }
    finally { setIsLoadingLikes(false); }
  };

  const messageLiker = (user, post) => {
    setActiveConversationId(user._id);
    setComposerPostReply(makePostReply(post));
    setWorkspaceSection("chat");
    setLikesForPost(null);
  };

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

      {navigator.onLine ? <form onSubmit={submitPost} className="mt-5 rounded-2xl border border-border bg-background p-3 sm:p-4">
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
      </form> : <p className="mt-5 rounded-xl bg-accent/5 p-3 text-sm text-muted">Offline mode shows posts you viewed earlier. Go online to load new posts.</p>}

      <div className="mt-5 space-y-4">
        {isLoading ? <p className="py-8 text-center text-sm text-muted">Loading posts…</p> : null}
        {!isLoading && posts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
            Nothing posted yet. Share the first photo or video.
          </p>
        ) : null}
        {posts.map((post) => (
          <article key={post._id} ref={(element) => cacheViewedPost(element, post)} className="overflow-hidden rounded-2xl border border-border bg-background">
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
                  onClick={() => toggleLike(post)}
                  className={`inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold ${post.likedByMe ? "text-rose-500" : "text-muted hover:bg-surface hover:text-rose-500"}`}
                  aria-label={`${post.likedByMe ? "Unlike" : "Like"} post, ${post.likeCount || 0} likes`}
                  title="Like post"
                >
                  <span>{formatLikeCount(post.likeCount)}</span>
                  <HeartIcon className={`size-5 ${post.likedByMe ? "fill-current" : ""}`} />
                </button>
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
              {navigator.onLine && String(post.userId?._id) === String(authUser?._id) ? (
                <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (ownerLikeClickTimer.current) clearTimeout(ownerLikeClickTimer.current);
                    ownerLikeClickTimer.current = setTimeout(() => { toggleLike(post); ownerLikeClickTimer.current = null; }, 260);
                  }}
                  onDoubleClick={() => {
                    if (ownerLikeClickTimer.current) clearTimeout(ownerLikeClickTimer.current);
                    ownerLikeClickTimer.current = null;
                    showPostLikes(post);
                  }}
                  className={`inline-flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold ${post.likedByMe ? "text-rose-500" : "text-muted hover:bg-surface hover:text-rose-500"}`}
                  aria-label="Like post; double click to see who liked it"
                  title="Like post; double click to see who liked it"
                >
                  <span>{formatLikeCount(post.likeCount)}</span>
                  <HeartIcon className={`size-5 ${post.likedByMe ? "fill-current" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => deletePost(post._id)}
                  className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-danger"
                  aria-label="Delete post"
                >
                  <Trash2Icon className="size-4" />
                </button>
                </div>
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
      {likesForPost ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setLikesForPost(null); }}>
          <section role="dialog" aria-modal="true" aria-label="People who liked your post" className="w-full max-w-sm rounded-2xl border border-border bg-background p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Likes · {formatLikeCount(likesForPost.post.likeCount)}</h2>
              <button type="button" className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-surface" onClick={() => setLikesForPost(null)}>Close</button>
            </div>
            {isLoadingLikes ? <p className="py-6 text-center text-sm text-muted">Loading likes…</p> : likesForPost.users.length ? (
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {likesForPost.users.map((user) => <li key={user._id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface">
                  <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {user.profilePic ? <img src={user.profilePic} alt="" className="size-full object-cover" /> : user.fullName?.slice(0, 1).toUpperCase() || <UserRoundIcon className="size-4" />}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{user.fullName || "Chat user"}</span>
                  <button type="button" onClick={() => messageLiker(user, likesForPost.post)} className="grid size-9 place-items-center rounded-lg text-accent hover:bg-accent/10" aria-label={`Message ${user.fullName || "user"}`} title="Message"><MessageCircleIcon className="size-5" /></button>
                </li>)}
              </ul>
            ) : <p className="py-6 text-center text-sm text-muted">No one has liked this post yet.</p>}
          </section>
        </div>
      ) : null}
    </section>
  );
}
