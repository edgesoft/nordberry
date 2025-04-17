-- CreateIndex
CREATE INDEX "Chain_projectId_idx" ON "Chain"("projectId");

-- CreateIndex
CREATE INDEX "Chain_ownerId_idx" ON "Chain"("ownerId");

-- CreateIndex
CREATE INDEX "Chain_deletedAt_idx" ON "Chain"("deletedAt");

-- CreateIndex
CREATE INDEX "Chain_createdAt_idx" ON "Chain"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_taskId_idx" ON "Comment"("taskId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_deletedAt_idx" ON "Comment"("deletedAt");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_taskId_deletedAt_createdAt_idx" ON "Comment"("taskId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "File_commentId_idx" ON "File"("commentId");

-- CreateIndex
CREATE INDEX "File_userId_idx" ON "File"("userId");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "File"("createdAt");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE INDEX "Task_chainId_idx" ON "Task"("chainId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

-- CreateIndex
CREATE INDEX "Task_chainId_sortOrder_idx" ON "Task"("chainId", "sortOrder");

-- CreateIndex
CREATE INDEX "TaskUser_userId_idx" ON "TaskUser"("userId");

-- CreateIndex
CREATE INDEX "TaskUser_taskId_idx" ON "TaskUser"("taskId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
