-- CreateIndex
CREATE INDEX "question_elasticsearch_relation_question_id_idx" ON "question_elasticsearch_relation"("question_id");

-- CreateIndex
CREATE INDEX "question_elasticsearch_relation_elasticsearch_id_idx" ON "question_elasticsearch_relation"("elasticsearch_id");
