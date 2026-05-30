CREATE INDEX IF NOT EXISTS "Session_userId_createdAt_idx" ON "Session"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Chat_userId_updatedAt_idx" ON "Chat"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt");
CREATE INDEX IF NOT EXISTS "Upload_userId_createdAt_idx" ON "Upload"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiPrediction_userId_createdAt_idx" ON "AiPrediction"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
