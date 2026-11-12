#!/bin/bash
set -euo pipefail

ios_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ios_dir"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"

# A local distribution identity avoids the cloud signing failure for this team.
# https://developer.apple.com/forums/thread/843700
if ! security find-identity -v -p codesigning | /usr/bin/grep -q 'Apple Distribution:.*(VQ5YW53SA9)'; then
    echo 'An Apple Distribution certificate for this team is required in the Mac keychain.' >&2
    exit 1
fi

mkdir -p build/TestFlight
release_dir="$(mktemp -d "$ios_dir/build/TestFlight/release.XXXXXX")"
echo "Release artifacts: $release_dir"

xcodebuild \
    -project PhotoPro/PhotoPro.xcodeproj \
    -scheme PhotoPro \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$release_dir/PhotoPro.xcarchive" \
    -allowProvisioningUpdates archive

xcodebuild \
    -exportArchive \
    -archivePath "$release_dir/PhotoPro.xcarchive" \
    -exportOptionsPlist scripts/TestFlightExportOptions.plist \
    -exportPath "$release_dir/export" \
    -allowProvisioningUpdates

echo 'Upload succeeded. Wait for Apple processing and confirm the build is available in TestFlight.'
