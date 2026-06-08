#!/bin/zsh
cd "$(dirname "$0")"
python3 scripts/kitchen.py
echo ""
echo "按回车关闭窗口"
read
