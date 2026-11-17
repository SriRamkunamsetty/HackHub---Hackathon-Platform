import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "../components/Layout";
import { useAppContext } from "../context/AppContext";
import axios from "axios";
import { useRouter } from "next/router";

interface ChatMessage {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
  isCurrentUser: boolean;
}

export default function Chat() {
  const router = useRouter();
  const { currentUser, teamMembers, isAuthenticated, isInitialized } =
    useAppContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionType, setConnectionType] = useState<"socket" | "polling">(
    "polling"
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auth redirection
  useEffect(() => {
    if (isInitialized && !isAuthenticated && typeof window !== "undefined") {
      router.replace("/auth");
    }
  }, [isAuthenticated, isInitialized, router]);

  // ------------------- Format Message Helper -------------------
  const formatIncomingMessage = useCallback(
    (m: any, myUserId?: string, myName?: string): ChatMessage => {
      const isMine =
        Boolean(myUserId && m.sender && (m.sender._id || m.sender) === myUserId) ||
        Boolean(myName && m.senderName === myName) ||
        Boolean(myName && m.author === myName);

      const senderDisplay = m.senderName || m.author || "Teammate";
      const initial = (senderDisplay || "T").charAt(0).toUpperCase();

      return {
        id: m._id || m.id || String(Date.now() + Math.random()),
        author: senderDisplay,
        avatar: isMine
          ? currentUser?.avatar ||
            `https://placehold.co/40x40/8b5cf6/ffffff?text=${initial}`
          : `https://placehold.co/40x40/38bdf8/ffffff?text=${initial}`,
        time: m.createdAt
          ? new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        text: m.text || m.message || "",
        isCurrentUser: isMine,
      };
    },
    [currentUser]
  );

  // ------------------- Fetch Messages from Backend -------------------
  const fetchMessages = useCallback(async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    try {
      if (token) {
        const res = await axios.get(`${API_URL}/chat`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(res.data)) {
          const userStr = localStorage.getItem("user");
          const userObj = userStr ? JSON.parse(userStr) : null;
          const myId = userObj?._id || userObj?.id;
          const myName = currentUser?.name || userObj?.name;

          const formatted = res.data.map((m: any) =>
            formatIncomingMessage(m, myId, myName)
          );

          setMessages(formatted);
        }
      }
    } catch (err) {
      console.warn("Could not fetch team messages from Express backend:", err);
    }
  }, [currentUser, formatIncomingMessage]);

  // ------------------- Real-Time Socket.IO & Polling Sync -------------------
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchMessages();

    // 1. Setup Socket.IO client if available
    let socket: any = null;
    try {
      const { io } = require("socket.io-client");
      const socketUrl =
        process.env.NEXT_PUBLIC_API_URL
          ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, "")
          : "http://localhost:5000";

      socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        setIsConnected(true);
        setConnectionType("socket");

        // Join team room
        const userStr = localStorage.getItem("user");
        const userObj = userStr ? JSON.parse(userStr) : null;
        if (userObj?.teamId) {
          socket.emit("joinTeam", userObj.teamId);
        }
      });

      socket.on("newMessage", (rawMsg: any) => {
        const userStr = localStorage.getItem("user");
        const userObj = userStr ? JSON.parse(userStr) : null;
        const myId = userObj?._id || userObj?.id;
        const myName = currentUser?.name || userObj?.name;

        const newChatMsg = formatIncomingMessage(rawMsg, myId, myName);

        setMessages((prev) => {
          if (prev.some((m) => m.id === newChatMsg.id)) {
            return prev;
          }
          return [...prev, newChatMsg];
        });
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
        setConnectionType("polling");
      });
    } catch (e) {
      console.log("Socket.IO client not loaded, falling back to live polling");
      setConnectionType("polling");
    }

    // 2. Resilient live background polling (checks every 3 seconds)
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated, fetchMessages, formatIncomingMessage, currentUser]);

  // ------------------- Send New Message -------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    const userStr =
      typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const userObj = userStr ? JSON.parse(userStr) : null;
    const myName = currentUser?.name || userObj?.name || "You";

    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      author: myName,
      avatar:
        currentUser?.avatar ||
        `https://placehold.co/40x40/8b5cf6/ffffff?text=${myName
          .charAt(0)
          .toUpperCase()}`,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      text: messageText,
      isCurrentUser: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      if (token) {
        const res = await axios.post(
          `${API_URL}/chat`,
          { text: messageText },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data && res.data._id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticMessage.id
                ? { ...m, id: res.data._id }
                : m
            )
          );
        }
      }
    } catch (err: any) {
      console.error("Failed to send message to team chat:", err);
    } finally {
      setIsSending(false);
    }
  };

  // ------------------- Summarize Chat with AI -------------------
  const summarizeChat = async () => {
    if (messages.length === 0) {
      alert("No messages to summarize yet.");
      return;
    }

    setShowSummaryModal(true);
    setIsGeneratingSummary(true);
    setSummaryText("");

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    const chatHistory = messages
      .map((m) => `${m.author}: ${m.text}`)
      .join("\n");

    try {
      const res = await axios.post(`${API_URL}/gemini`, {
        prompt: `Please concisely summarize the following team hackathon chat conversation. Highlight key updates, decisions, and any action items:\n\n${chatHistory}`,
      });

      if (res.data && res.data.response) {
        setSummaryText(res.data.response);
      } else {
        throw new Error("No response returned");
      }
    } catch (err) {
      // Fallback to local python summarizer if available
      try {
        const fallbackRes = await axios.post("http://127.0.0.1:5000/summarize", {
          chat: messages.map((m) => ({ message: m.text })),
        });
        setSummaryText(
          fallbackRes.data.summary || "Summary generated successfully."
        );
      } catch (fallbackErr) {
        setSummaryText(
          "Unable to summarize chat at this moment. Please ensure the backend or Gemini API key is configured."
        );
      }
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <h2 className="text-display-md font-display text-gradient-primary text-glow">
          Team Chat
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-blue-500/10 text-blue-300 border-blue-500/30"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-blue-400"
              }`}
            />
            {isConnected ? "Real-time Connected" : "Live Sync Active"}
          </span>
          <button
            onClick={summarizeChat}
            disabled={messages.length === 0}
            className="btn-primary text-xs sm:text-sm py-1.5 px-3"
          >
            Summarize Chat
          </button>
        </div>
      </div>

      <p className="text-body-sm font-body text-zinc-400 mb-6 max-w-3xl">
        This is your central team communication hub. Messages update in
        real-time without needing to refresh. Use the AI Summarizer anytime to
        condense recent discussions into quick action items.
      </p>

      <div className="card h-[70vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-zinc-700/60 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-heading-lg font-heading">#general</h3>
            <span className="text-caption text-zinc-400">
              ({messages.length} messages)
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
              <p className="text-heading-sm font-heading mb-1 text-zinc-300">
                No messages yet
              </p>
              <p className="text-body-xs font-body max-w-sm">
                Say hello to your teammates! Messages will update instantly for
                all members of your team.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 chat-message ${
                  message.isCurrentUser ? "flex-row-reverse" : ""
                }`}
              >
                <img
                  src={message.avatar}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                  alt={message.author}
                />
                <div
                  className={`flex flex-col ${
                    message.isCurrentUser ? "items-end" : "items-start"
                  }`}
                >
                  <p className="text-heading-sm font-heading text-xs text-zinc-400 mb-0.5">
                    {message.author}
                    <span className="text-caption text-zinc-500 ml-2">
                      {message.time}
                    </span>
                  </p>
                  <div
                    className={`${
                      message.isCurrentUser
                        ? "glass bg-gradient-to-r from-purple-600/30 to-pink-600/30 border-purple-500/40 text-white"
                        : "glass text-zinc-200"
                    } p-3 rounded-2xl max-w-md break-words`}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSendMessage}
          className="mt-4 pt-4 border-t border-zinc-700/60 flex gap-2"
        >
          <input
            type="text"
            placeholder="Type your team message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSending}
            className="input-enhanced flex-1 placeholder-enhanced"
          />
          <button
            type="submit"
            disabled={isSending || !newMessage.trim()}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>

      {/* ------------------- AI Summary Modal ------------------- */}
      {showSummaryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="card w-full max-w-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-heading-xl font-heading mb-4 flex items-center gap-2">
              <span>✨</span> AI Discussion Summary
            </h2>

            <div className="text-body-md font-body text-zinc-300 max-h-[60vh] overflow-y-auto pr-2 bg-slate-900/50 p-4 rounded-xl border border-zinc-800">
              {isGeneratingSummary ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-zinc-400">
                    Generating comprehensive discussion summary...
                  </p>
                </div>
              ) : (
                <p className="whitespace-pre-line leading-relaxed">
                  {summaryText}
                </p>
              )}
            </div>

            <button
              onClick={() => setShowSummaryModal(false)}
              className="w-full mt-6 btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
