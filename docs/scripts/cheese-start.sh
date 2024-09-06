#!/bin/sh
sudo systemctl start docker.service

sudo docker network create cheese_network

sudo docker run -d \
    --name elasticsearch \
    --network cheese_network \
    -e discovery.type=single-node \
    -e xpack.security.enabled=true \
    -e ELASTIC_USERNAME=elastic \
    -e ELASTIC_PASSWORD=elastic \
    --health-cmd="curl http://localhost:9200/_cluster/health" \
    --health-interval=10s \
    --health-timeout=5s \
    --health-retries=10 \
    -p 9200:9200 \
    docker.elastic.co/elasticsearch/elasticsearch:8.12.1

sudo docker run -d \
    --name postgres \
    --network cheese_network \
    -e POSTGRES_PASSWORD=postgres \
    --health-cmd="pg_isready" \
    --health-interval=10s \
    --health-timeout=5s \
    --health-retries=5 \
    -p 5432:5432 \
    postgres
echo "Wait for 5 seconds please..."
sleep 5
sudo docker exec -i postgres bash << EOF
    sed -i -e 's/max_connections = 100/max_connections = 1000/' /var/lib/postgresql/data/postgresql.conf
    sed -i -e 's/shared_buffers = 128MB/shared_buffers = 2GB/' /var/lib/postgresql/data/postgresql.conf
EOF
sudo docker restart --time 0 postgres

sudo docker run -d \
    --name cheese_legacy \
    --network cheese_network \
    -p 3000:3000 \
    -e PORT=3000 \
    -e JWT_SECRET="test-secret" \
    -e PRISMA_DATABASE_URL="postgresql://postgres:postgres@postgres:5432/postgres?schema=public&connection_limit=16" \
    -e ELASTICSEARCH_NODE=http://elasticsearch:9200/ \
    -e ELASTICSEARCH_AUTH_USERNAME=elastic \
    -e ELASTICSEARCH_AUTH_PASSWORD=elastic \
    -e FILE_UPLOAD_PATH=/app/uploads \
    -e DEFAULT_AVATAR_NAME=default.jpg \
    -e EMAIL_SMTP_HOST=smtp.example.com \
    -e EMAIL_SMTP_PORT=587 \
    -e EMAIL_SMTP_SSL_ENABLE=true \
    -e EMAIL_SMTP_USERNAME=user@example.com \
    -e EMAIL_SMTP_PASSWORD=a_super_strong_password \
    -e EMAIL_DEFAULT_FROM="No Reply <noreply@example.com>" \
    ghcr.io/sageseekersociety/cheese-backend-dev:dev \
    bash -c '
    if [ ! -f "FLAG_INIT" ]; then
        touch FLAG_INIT
        pnpm prisma db push
    fi
    pnpm start
    '