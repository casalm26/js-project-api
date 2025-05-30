import express from "express"
import { getApiDocumentation } from "../config/apiDocs.js"

const router = express.Router()

// GET / - API documentation
router.get("/", (req, res) => {
  res.json(getApiDocumentation())
})

export default router 