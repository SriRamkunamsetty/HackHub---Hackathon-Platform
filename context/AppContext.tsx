import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from "react";

// ------------------- Types -------------------
export interface TaskUserRef {
  _id?: string;
  name?: string;
  email?: string;
}

export interface Task {
  id: string;
  _id?: string;
  title: string;
  description: string;
  status: "To Do" | "In Progress" | "Done";
  assignee: string;
  assignedTo?: TaskUserRef | string | null;
  createdBy?: TaskUserRef | string | null;
  dueDate?: Date;
  team?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email?: string;
}

export type AppContextType = {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  login: (username: string, password?: string) => void;
  logout: () => void;

  isInitialized: boolean;

  teamName: string;
  setTeamName: (name: string) => void;
  teamBio: string;
  setTeamBio: (bio: string) => void;
  teamMembers: TeamMember[];
  setTeamMembers: (members: TeamMember[]) => void;
  addTeamMember: (member: Omit<TeamMember, "id">) => void;

  currentUser: TeamMember | null;
  setCurrentUser: (user: TeamMember | null) => void;

  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, "id"> & { id?: string }) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  tasksLoading: boolean;

  deadline: Date | null;
  setDeadline: (date: Date | null) => void;

  hackathonEndTime: Date | null;
  setHackathonEndTime: (date: Date | null) => void;
  resetHackathonTimer: () => void;
};

const defaultContextValue: AppContextType = {
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  login: () => {},
  logout: () => {},
  isInitialized: false,
  teamName: "My Team",
  setTeamName: () => {},
  teamBio: "Our team is participating in a hackathon!",
  setTeamBio: () => {},
  teamMembers: [],
  setTeamMembers: () => {},
  addTeamMember: () => {},
  currentUser: null,
  setCurrentUser: () => {},
  tasks: [],
  setTasks: () => {},
  addTask: async () => {},
  updateTask: async () => {},
  deleteTask: async () => {},
  fetchTasks: async () => {},
  tasksLoading: false,
  deadline: null,
  setDeadline: () => {},
  hackathonEndTime: null,
  setHackathonEndTime: () => {},
  resetHackathonTimer: () => {},
};

export const AppContext = createContext<AppContextType>(defaultContextValue);
export const useAppContext = () => useContext(AppContext);

type AppProviderProps = {
  children: ReactNode;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const initialDefaultTasks: Task[] = [
  {
    id: "1",
    title: "Design user interface",
    description: "Create wireframes and design system",
    status: "To Do",
    assignee: "You",
  },
  {
    id: "2",
    title: "Set up database",
    description: "Configure MongoDB and create schemas",
    status: "To Do",
    assignee: "You",
  },
  {
    id: "3",
    title: "Implement authentication",
    description: "Add user login and registration",
    status: "To Do",
    assignee: "You",
  },
  {
    id: "4",
    title: "Create landing page",
    description: "Design and implement the landing page",
    status: "To Do",
    assignee: "You",
  },
];

// Helper to normalize task data from backend or local storage
const normalizeBackendTask = (raw: Record<string, unknown>): Task => {
  const id = typeof raw._id === "string" ? raw._id : typeof raw.id === "string" ? raw.id : `task-${Date.now()}`;
  const title = typeof raw.title === "string" ? raw.title : "Untitled Task";
  const description = typeof raw.description === "string" ? raw.description : "";
  const statusRaw = raw.status;
  const status: "To Do" | "In Progress" | "Done" =
    statusRaw === "In Progress" || statusRaw === "Done" ? statusRaw : "To Do";

  let assigneeName = "Unassigned";
  if (raw.assignedTo && typeof raw.assignedTo === "object" && "name" in raw.assignedTo) {
    assigneeName = String((raw.assignedTo as { name?: string }).name || "Unassigned");
  } else if (typeof raw.assignee === "string" && raw.assignee) {
    assigneeName = raw.assignee;
  }

  return {
    id,
    _id: typeof raw._id === "string" ? raw._id : undefined,
    title,
    description,
    status,
    assignee: assigneeName,
    assignedTo: (raw.assignedTo as TaskUserRef | string | null) || null,
    createdBy: (raw.createdBy as TaskUserRef | string | null) || null,
    team: typeof raw.team === "string" ? raw.team : undefined,
    dueDate: raw.dueDate ? new Date(String(raw.dueDate)) : undefined,
  };
};

// ------------------- Provider -------------------
export const AppProvider = ({ children }: AppProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [teamName, setTeamName] = useState("My Team");
  const [teamBio, setTeamBio] = useState(
    "Our team is participating in a hackathon!"
  );
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);

  const [tasks, setTasks] = useState<Task[]>(initialDefaultTasks);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [deadline, setDeadline] = useState<Date | null>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const [hackathonEndTime, setHackathonEndTime] = useState<Date | null>(null);

  // ------------------- Fetch Tasks From Backend -------------------
  const fetchTasks = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setTasksLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mappedTasks = data.map((t) => normalizeBackendTask(t));
          setTasks(mappedTasks);
          localStorage.setItem("hackhub_tasks", JSON.stringify(mappedTasks));
        }
      }
    } catch (err) {
      console.warn("Backend tasks fetch unavailable, using local cache:", err);
      const cached = localStorage.getItem("hackhub_tasks");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
          }
        } catch {
          // ignore cache parse error
        }
      }
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // ------------------- Initialize Auth from localStorage -------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAuth = localStorage.getItem("isAuthenticated");
      const savedUser = localStorage.getItem("currentUser");
      const cachedTasks = localStorage.getItem("hackhub_tasks");

      if (savedAuth === "true") {
        setIsAuthenticated(true);
      }

      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }

      if (cachedTasks) {
        try {
          const parsed = JSON.parse(cachedTasks);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
          }
        } catch {
          // ignore
        }
      }

      setIsInitialized(true);
    }
  }, []);

  // Sync tasks on auth
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, fetchTasks]);

  // ------------------- Sync Auth State -------------------
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      if (isAuthenticated) {
        localStorage.setItem("isAuthenticated", "true");
      } else {
        localStorage.removeItem("isAuthenticated");
      }
    }
  }, [isAuthenticated, isInitialized]);
  // ------------------- Load team from backend -------------------
  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const API_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

    fetch(`${API_URL}/teams/myteam`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.team) return;

        setTeamName(data.team.name);
        setTeamMembers(
          data.team.members
            .filter((m: any) => m.user)
            .map((m: any) => ({
              id: m.user._id,
              name: m.user.name,
              role: m.role,
              avatar: `https://placehold.co/40x40/38bdf8/ffffff?text=${m.user.name
                .charAt(0)
                .toUpperCase()}`,
            }))
        );
      })
      .catch((err) => console.error("Failed to load team:", err));
  }, [isAuthenticated]);
  // ------------------- Hackathon Timer Persistence -------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedEndTime = localStorage.getItem("hackathonEndTime");
      const storedDeadline = localStorage.getItem("projectDeadline");

      if (storedDeadline) {
        const deadlineDate = new Date(storedDeadline);
        setDeadline(deadlineDate);
        setHackathonEndTime(deadlineDate);
      } else if (storedEndTime) {
        setHackathonEndTime(new Date(storedEndTime));
      } else {
        const defaultEndTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
        setHackathonEndTime(defaultEndTime);
        localStorage.setItem("hackathonEndTime", defaultEndTime.toISOString());
      }
    }
  }, []);

  useEffect(() => {
    if (hackathonEndTime && typeof window !== "undefined") {
      localStorage.setItem("hackathonEndTime", hackathonEndTime.toISOString());
    }
  }, [hackathonEndTime]);

  // ------------------- Auth Functions -------------------
  const login = (username: string, _password?: string) => {
    const user: TeamMember = {
      id: `user-${Date.now()}`,
      name: username,
      role: "Team Member",
      avatar: `https://placehold.co/200x200/1e293b/38bdf8?text=${username
        .charAt(0)
        .toUpperCase()}`,
    };

    setCurrentUser(user);
    setIsAuthenticated(true);

    if (typeof window !== "undefined") {
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("currentUser", JSON.stringify(user));
    }
  };

    const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setTeamName("My Team");
    setTeamMembers([]);

    if (typeof window !== "undefined") {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  };

  // ------------------- Tasks & Team API Integration -------------------
  const addTask = async (task: Omit<Task, "id"> & { id?: string }) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      try {
        const assignedToId =
          typeof task.assignedTo === "object" && task.assignedTo
            ? task.assignedTo._id
            : typeof task.assignedTo === "string"
            ? task.assignedTo
            : undefined;

        const res = await fetch(`${API_BASE_URL}/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: task.title,
            description: task.description || "",
            assignedTo: assignedToId || undefined,
          }),
        });

        if (res.ok) {
          const created = await res.json();
          const normalized = normalizeBackendTask(created);
          setTasks((prev) => {
            const updated = [normalized, ...prev];
            if (typeof window !== "undefined") {
              localStorage.setItem("hackhub_tasks", JSON.stringify(updated));
            }
            return updated;
          });
          return;
        }
      } catch (err) {
        console.warn("Backend addTask failed, falling back to local state:", err);
      }
    }

    // Local fallback
    const localTask: Task = {
      id: task.id || `task-${Date.now()}`,
      title: task.title,
      description: task.description || "",
      status: task.status || "To Do",
      assignee: task.assignee || "You",
      assignedTo: task.assignedTo || null,
      dueDate: task.dueDate,
    };

    setTasks((prev) => {
      const updated = [localTask, ...prev];
      if (typeof window !== "undefined") {
        localStorage.setItem("hackhub_tasks", JSON.stringify(updated));
      }
      return updated;
    });
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === id || t._id === id ? { ...t, ...updates } : t
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("hackhub_tasks", JSON.stringify(updated));
      }
      return updated;
    });

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token && id && !id.startsWith("task-")) {
      try {
        await fetch(`${API_BASE_URL}/tasks/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.warn("Failed to sync task update to backend:", err);
      }
    }
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== id && t._id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem("hackhub_tasks", JSON.stringify(updated));
      }
      return updated;
    });

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token && id && !id.startsWith("task-")) {
      try {
        await fetch(`${API_BASE_URL}/tasks/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.warn("Failed to sync task deletion to backend:", err);
      }
    }
  };

  const addTeamMember = (member: Omit<TeamMember, "id">) => {
    const newMember: TeamMember = {
      ...member,
      id: `member-${Date.now()}`,
    };
    setTeamMembers((prev) => [...prev, newMember]);
  };

  // ------------------- Deadlines -------------------
  const updateDeadline = (date: Date | null) => {
    setDeadline(date);
    if (date) {
      setHackathonEndTime(date);
      if (typeof window !== "undefined") {
        localStorage.setItem("projectDeadline", date.toISOString());
        localStorage.setItem("hackathonEndTime", date.toISOString());
      }
    }
  };

  const resetHackathonTimer = () => {
    const newEndTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    setHackathonEndTime(newEndTime);
    setDeadline(newEndTime);
    if (typeof window !== "undefined") {
      localStorage.setItem("hackathonEndTime", newEndTime.toISOString());
      localStorage.setItem("projectDeadline", newEndTime.toISOString());
    }
  };

  // ------------------- Context Value -------------------
  const value: AppContextType = {
    isAuthenticated,
    setIsAuthenticated,
    login,
    logout,
    isInitialized,
    teamName,
    setTeamName,
    teamBio,
    setTeamBio,
    teamMembers,
    setTeamMembers,
    addTeamMember,
    currentUser,
    setCurrentUser,
    tasks,
    setTasks,
    addTask,
    updateTask,
    deleteTask,
    fetchTasks,
    tasksLoading,
    deadline,
    setDeadline: updateDeadline,
    hackathonEndTime,
    setHackathonEndTime,
    resetHackathonTimer,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
