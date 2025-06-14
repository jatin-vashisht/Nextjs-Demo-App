#!/bin/bash

# Setup script for Cloudflare KV
echo "Setting up Cloudflare KV for image caching..."

# Create KV namespaces
echo "Creating KV namespaces..."
wrangler kv:namespace create "IMAGE_CACHE"
wrangler kv:namespace create "IMAGE_CACHE" --preview

echo "KV namespaces created!"
echo "Please update your wrangler.jsonc with the namespace IDs shown above."

# Set secrets
echo "Setting up secrets..."
echo "Please run the following commands to set your secrets:"
echo "wrangler secret put CLOUDFLARE_API_TOKEN"

echo "Setup complete!"
echo "Don't forget to:"
echo "1. Update the KV namespace IDs in wrangler.jsonc"
echo "2. Set your CLOUDFLARE_API_TOKEN secret"
echo "3. Deploy with: wrangler deploy"
