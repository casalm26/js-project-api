import cors from "cors"
import express from "express"
import dotenv from "dotenv"
import indexRoutes from "./routes/index.js"
import thoughtsRoutes from "./routes/thoughts.js"
import { loadThoughtsData } from "./services/dataService.js"

// Load environment variables
dotenv.config()

// Initialize data
loadThoughtsData()

// App configuration
const port = process.env.PORT || 8080
const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/", indexRoutes)
app.use("/thoughts", thoughtsRoutes)

// Catch-all 404 route for unknown paths
app.use("*", (req, res) => {
  res.status(404).json({ "error": "Endpoint not found" })
})

// Global error-handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: "Internal Server Error", 
    details: err.message 
  })
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
