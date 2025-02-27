#!/bin/sh
sudo systemctl start docker
sudo docker restart elasticsearch postgres cheese_legacy
