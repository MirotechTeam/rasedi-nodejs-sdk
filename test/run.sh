#!/bin/sh

echo "Starting SDK stability test..."

versions=$(echo "$PACKAGE_VERSIONS" | tr ',' ' ')

stable_versions=""



for version in $versions; do
    echo ""
    echo "==============================="
    echo "Testing SDK version $version ..."
    echo "==============================="

    rm -rf ./node_modules
    rm -rf ./package.json
    rm -rf ./package-lock.json

    npm init -y >/dev/null 2>&1
    npm i dotenv >/dev/null 2>&1
    npm i "rasedi@$version" >/dev/null 2>&1

    node ./index.js


    exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo "❌ Version $version failed (exit code $exit_code)"
    else
        echo "✅ Version $version passed"
        stable_versions="$stable_versions $version"
    fi
done

echo ""
echo "================================="
echo "Stable SDK versions summary:"
echo "================================="

if [ -z "$stable_versions" ]; then
    echo "No stable versions found 😢"
else
    echo "Stable versions:$stable_versions"
fi