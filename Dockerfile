FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive

# Install curl, git, node (with npm), and bash
RUN apt-get update && apt-get install -y \
    curl \
    git \
    bash \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy current folder into container
COPY . .

# Default command: start a bash shell
CMD ["/bin/bash"]
