#!/bin/bash

echo "🚀 Setting up Video/Audio Call functionality..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install server dependencies
echo "📦 Installing server dependencies..."
npm install express socket.io cors
npm install -D nodemon

# Create server package.json if it doesn't exist
if [ ! -f "server-package.json" ]; then
    echo "❌ server-package.json not found. Please make sure all files are in place."
    exit 1
fi

# Rename server package.json
mv server-package.json package.json

echo "✅ Dependencies installed successfully!"

# Create .env.local file for Next.js
if [ ! -f ".env.local" ]; then
    echo "🔧 Creating .env.local file..."
    echo "NEXT_PUBLIC_SIGNALING_SERVER_URL=http://localhost:5000" > .env.local
    echo "✅ .env.local created"
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🎉 Setup complete! Here's what to do next:"
echo ""
echo "1. Start the signaling server:"
echo "   npm run dev"
echo ""
echo "2. In another terminal, start your Next.js app:"
echo "   npm run dev"
echo ""
echo "3. Test the call functionality by opening the CallTest component"
echo "   or using the video/audio call buttons in your chat header"
echo ""
echo "4. Make sure to allow camera and microphone permissions in your browser"
echo ""
echo "📚 For detailed instructions, see VIDEO_CALL_README.md"
echo ""
echo "🚀 Happy calling!"