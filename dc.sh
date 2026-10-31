docker kill $(docker ps -q)
docker rm $(docker ps -qa)
docker rmi $(docker images -qa)
docker network rm microservices-network