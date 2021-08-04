#!/usr/bin/env sh

cd /var/www

echo ""
echo "#################################################################################################################"
echo "Running NodeJS Backend Server: $(date +"%d.%m.%Y %r")"
echo ""

npm install

echo ""
echo "APP Started: $(date +"%d.%m.%Y %r")"
echo "#################################################################################################################"
echo ""

export NODE_OPTIONS="--max-old-space-size=2048"

npm run start
