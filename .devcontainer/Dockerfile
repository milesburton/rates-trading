# Use Ubuntu base image from Dev Containers
FROM mcr.microsoft.com/devcontainers/base:ubuntu

# Avoid interactive dialogue during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  fish jq git unzip curl ripgrep ssh \
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

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER vscode
