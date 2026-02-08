#!/bin/bash
# 更新 .env 文件中的 JWT_SECRET

JWT_SECRET=$(openssl rand -base64 32)

if [ -f .env ]; then
    # 如果 JWT_SECRET 还是默认值，则更新它
    if grep -q "your-super-secret-jwt-key-change-this-in-production" .env; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        else
            # Linux
            sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
        fi
        echo "✅ JWT_SECRET 已更新"
        echo "新的 JWT_SECRET: $JWT_SECRET"
    else
        echo "⚠️  JWT_SECRET 已经有自定义值，未修改"
    fi
    
    # 更新 FRONTEND_URL
    if grep -q "FRONTEND_URL" .env; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|FRONTEND_URL=.*|FRONTEND_URL=http://localhost:1307|" .env
        else
            sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=http://localhost:1307|" .env
        fi
        echo "✅ FRONTEND_URL 已更新为 http://localhost:1307"
    else
        echo "FRONTEND_URL=http://localhost:1307" >> .env
        echo "✅ 已添加 FRONTEND_URL=http://localhost:1307"
    fi
else
    echo "❌ .env 文件不存在，请先创建它"
fi
