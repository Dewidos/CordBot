echo "Pulling the latest changes from the repository..."
git pull
echo "Compiling the bot's code..."
tsc --skipLibCheck
echo "Starting the bot..."
node main.js
