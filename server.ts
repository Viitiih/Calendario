import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const DATA_FILE = path.join(process.cwd(), "data.json");

// Initial data structure
const initialData = {
  calendars: {}, // { id: { name, members: [], events: [], expenses: [], templates: [] } }
  users: {} // { id: { name, email, color } }
};

// Load data from file
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } catch (e) {
      console.error("Error loading data:", e);
      return initialData;
    }
  }
  return initialData;
}

// Save data to file
function saveData(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving data:", e);
  }
}

let data = loadData();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/data", (req, res) => {
    res.json(data);
  });

  app.get("/api/calendar/:id", (req, res) => {
    console.log(`[API] GET /api/calendar/${req.params.id}`);
    let cal = data.calendars[req.params.id];
    
    // Fallback: search by invite code if not found by id
    if (!cal) {
      cal = Object.values(data.calendars).find((c: any) => 
        c.inviteCode && c.inviteCode.toLowerCase() === req.params.id.toLowerCase()
      );
    }
    
    if (cal) {
      res.json(cal);
    } else {
      res.status(404).json({ error: "Calendar not found" });
    }
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-calendar", (calendarId) => {
      socket.join(calendarId);
      console.log(`User joined calendar: ${calendarId}`);
    });

    socket.on("update-calendar", ({ calendarId, calendarData }) => {
      data.calendars[calendarId] = calendarData;
      saveData(data);
      socket.to(calendarId).emit("calendar-updated", calendarData);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [DATA_FILE, "**/data.json"],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
