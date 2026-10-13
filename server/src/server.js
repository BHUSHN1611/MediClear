import { createApp } from './app.js'
import { config } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'

async function bootstrap() {
  const app = createApp()

  // Connect Database (Atlas or local)
  await connectDB()

  const server = app.listen(config.PORT, () => {
    console.log(`[MediClear Server] Running on http://localhost:${config.PORT}`)
    console.log(`[MediClear Server] Environment: ${config.NODE_ENV}`)
    console.log(`[MediClear Server] Client CORS: ${config.CLIENT_URL}`)
  })

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n[MediClear Server] Received ${signal}. Shutting down gracefully...`)
    server.close(async () => {
      await disconnectDB()
      console.log('[MediClear Server] Process terminated cleanly.')
      process.exit(0)
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

bootstrap().catch((err) => {
  console.error('[MediClear Server] Bootstrap failure:', err)
  process.exit(1)
})
