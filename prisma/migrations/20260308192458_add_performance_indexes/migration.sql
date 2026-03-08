-- CreateIndex
CREATE INDEX "ArticleTags_tagId_idx" ON "ArticleTags"("tagId");

-- CreateIndex
CREATE INDEX "Articles_authorId_idx" ON "Articles"("authorId");

-- CreateIndex
CREATE INDEX "Articles_status_idx" ON "Articles"("status");

-- CreateIndex
CREATE INDEX "Articles_createdAt_idx" ON "Articles"("createdAt");

-- CreateIndex
CREATE INDEX "Comments_articleId_idx" ON "Comments"("articleId");

-- CreateIndex
CREATE INDEX "Comments_parentId_idx" ON "Comments"("parentId");
