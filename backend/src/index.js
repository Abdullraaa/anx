import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth.js'
import jobRoutes from './routes/jobs.js'
import riderRoutes from './routes/riders.js'

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api', jobRoutes)
app.use('/api', riderRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

// Vercel's Express preset imports the app (Root Directory = backend).
// app.listen above stays for local dev via nodemon.
export default app
