# Use Ubuntu base image from Dev Containers
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Define package versions to pin (update these as needed for your Ubuntu version)
ARG FISH_VERSION=3.4.1-1
ARG JQ_VERSION=1.6-1
ARG GIT_VERSION=1:2.25.1-1ubuntu3.2
ARG UNZIP_VERSION=6.0-25ubuntu1
ARG CURL_VERSION=7.68.0-1ubuntu2.12
ARG RIPGREP_VERSION=11.0.2-1
ARG SSH_VERSION=1:8.2p1-4ubuntu0.5

# Avoid interactive dialogue during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies with pinned versions
RUN apt-get update && apt-get install -y --no-install-recommends \
  fish=${FISH_VERSION} \
  jq=${JQ_VERSION} \
  git=${GIT_VERSION} \
  unzip=${UNZIP_VERSION} \
  curl=${CURL_VERSION} \
  ripgrep=${RIPGREP_VERSION} \
  ssh=${SSH_VERSION} \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Fish Shell Plugins
RUN mkdir -p /home/vscode/.config/fish && \
  echo "set -U fish_greeting ''" >> /home/vscode/.config/fish/config.fish && \
  chown -R vscode:vscode /home/vscode/.config/fish

# Set Fish as the default shell for the vscode user
RUN chsh -s /usr/bin/fish vscode

# Ensure the SSH directory exists and has correct permissions
RUN mkdir -p /home/vscode/.ssh && \
  chmod 700 /home/vscode/.ssh && \
  chown -R vscode:vscode /home/vscode/.ssh

# Set work directory
WORKDIR /workspace

# Switch to non-root user
USER vscode

# Start Fish by default
CMD ["fish"]
