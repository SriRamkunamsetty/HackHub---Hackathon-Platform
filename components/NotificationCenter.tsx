import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
  X,
  AlertCircle,
} from "lucide-react";
import { useAppContext } from "../context/AppContext";

export interface NotificationItem {
  _id: string;
  recipient: string;
  sender?: {
    name: string;
    avatar?: string;
  };
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    _id: "notif-1",
    recipient: "all",
    sender: { name: "HackHub Team" },
    type: "announcement",
    title: "Welcome to HackHub!",
    message: "Explore hackathons, assemble teams, and start building cutting-edge projects.",
    link: "/dashboard",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    _id: "notif-2",
    recipient: "all",
    sender: { name: "Devpost AI Challenge" },
    type: "hackathon_alert",
    title: "Hackathon Registration Open",
    message: "Registration for AI Innovation Sprint 2026 is closing in 48 hours. Register your team now!",
    link: "/hackathons",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    _id: "notif-3",
    recipient: "all",
    sender: { name: "Mentor Dr. Sarah" },
    type: "mentor_feedback",
    title: "Mentor Feedback Received",
    message: "Great architecture overview! Suggested refining the backend caching layer before submission.",
    link: "/dashboard",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export default function NotificationCenter() {
  const router = useRouter();
  const { currentUser } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, [currentUser]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const userParam = currentUser?.email || currentUser?.name || "student";
      const res = await fetch(`http://localhost:5000/api/notifications?user=${encodeURIComponent(userParam)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.notifications && data.notifications.length > 0) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
          return;
        }
      }
    } catch {
      // Backend not running, fallback gracefully to mock notifications
    }
    setNotifications(DEFAULT_NOTIFICATIONS);
    setUnreadCount(DEFAULT_NOTIFICATIONS.filter((n) => !n.isRead).length);
  };

  const markAsRead = async (id: string, link?: string) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: "PUT",
      });
    } catch {
      // Mock update
    }

    setNotifications((prev) =>
      prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    if (link) {
      setIsOpen(false);
      router.push(link);
    }
  };

  const markAllAsRead = async () => {
    try {
      const userParam = currentUser?.email || currentUser?.name || "student";
      await fetch("http://localhost:5000/api/notifications/read-all", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userParam }),
      });
    } catch {
      // Fallback
    }

    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "task_assigned":
      case "task_updated":
        return <UserCheck className="w-4 h-4 text-emerald-400" />;
      case "team_invite":
      case "team_join_request":
        return <Users className="w-4 h-4 text-indigo-400" />;
      case "mentor_feedback":
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case "hackathon_alert":
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case "announcement":
        return <Sparkles className="w-4 h-4 text-cyan-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all duration-200"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-[10px] font-bold text-white shadow-lg ring-2 ring-[#0f172a] animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-gradient-to-b from-[#1e1b4b] to-[#0f172a] border border-white/15 shadow-2xl backdrop-blur-xl z-50 overflow-hidden text-white">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === "all"
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-3 py-1 rounded-lg transition ${
                activeTab === "unread"
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <Check className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                <p>No {activeTab === "unread" ? "unread " : ""}notifications right now</p>
                <p className="text-xs text-gray-500 mt-1">You are all caught up!</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => markAsRead(notif._id, notif.link)}
                  className={`p-4 flex items-start gap-3 hover:bg-white/5 cursor-pointer transition ${
                    !notif.isRead ? "bg-indigo-950/40 border-l-2 border-indigo-400" : ""
                  }`}
                >
                  <div className="p-2 rounded-lg bg-white/10 shrink-0 mt-0.5">
                    {getIconForType(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-200 truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                    {notif.sender?.name && (
                      <p className="text-[10px] text-indigo-300/80 mt-1.5 flex items-center gap-1">
                        From: <span className="font-medium">{notif.sender.name}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {notifications.length} total notification{notifications.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={clearAllNotifications}
                className="text-gray-400 hover:text-red-400 transition"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
