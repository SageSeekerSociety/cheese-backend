#!/bin/sh
sudo systemctl start docker.service

sudo docker run -d \
    --name elasticsearch \
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
