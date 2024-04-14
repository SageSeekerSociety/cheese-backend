#!/bin/bash
set -e

pnpm prisma migrate deploy

# put customize content in customize.sh, which won't
# be tracked by git
# remember to grant execute permission to the script
customize_file=".devcontainer/customize.sh"
if [ -f "$customize_file" ]; then
    echo "executing $customize_file"
    bash "$customize_file"
    echo "done"
else
    echo "no customize file found, done"
fi