from pathlib import Path
import sys
import shutil

SERVICE = Path(".service.example")

def generate_Dockerfile(name, port):
    """Generate Dockerfile"""
    docker = (
        'FROM node:26-alpine3.23\n\n'
        'WORKDIR /app\n\n'
        'COPY package*.json ./\n\n'
        'RUN npm ci\n\n'
        'COPY . .\n\n'
        f"EXPOSE {port}\n\n"
        'CMD ["npm", "start"]\n'
    )

    service_dir = Path(f"service-{name}")
    
    dockerfile = service_dir / "Dockerfile"

    dockerfile.write_text(docker, encoding="utf-8")

    print(f"Dockerfile generated: {dockerfile}")

def generate_env(name, port):
    """Generate .env"""
    service_dir = Path(f"service-{name}")

    config = (
        f"PORT={port}\n"
        f"NAME={name}\n"
    )
    
    service_env = service_dir / ".env"

    service_env.write_text(config, encoding="utf-8")

    print(f".env generated: {service_env}")



def generate_service(name, port):
    """Generate Service"""
    if not SERVICE.exists():
        sys.exit(f"Template folder not found: {SERVICE}")

    
    service_dir = Path(f"service-{name}")

    service_dir.mkdir(parents=True, exist_ok=True)

    for item in SERVICE.iterdir():
        dest = service_dir / item.name

        if item.is_dir():
            shutil.copytree(item, dest, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest)

    generate_env(name, port)
    generate_Dockerfile(name, port)

    


if __name__ == "__main__":
    generate_service("alpha", 5000)
    generate_service("beta", 5001)
    generate_service("delta", 5002)