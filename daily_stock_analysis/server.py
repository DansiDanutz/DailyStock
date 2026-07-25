# -*- coding: utf-8 -*-
"""
===================================
Daily Stock Analysis - FastAPI 后端服务入口
===================================

职责：
1. 提供 RESTful API 服务
2. 配置 CORS 跨域支持
3. 健康检查接口
4. 托管前端静态文件（生产模式）

启动方式：
    python main.py --serve-only

兼容入口 ``server:app`` 始终要求管理员认证已在带外完成配置，因为
外部 ASGI runner 提供的实际监听地址无法从应用对象中可靠获知。
    
    或使用 main.py:
    python main.py --serve-only      # 仅启动 API 服务
    python main.py --serve           # API 服务 + 执行分析
"""

import logging

from src.config import setup_env, get_config
from src.logging_config import setup_logging
from src.web_security import ensure_public_webui_is_provisioned

# 初始化环境变量与日志
setup_env()

config = get_config()
bind_host = config.webui_host or "127.0.0.1"
bind_port = config.webui_port or 8000

# ``server:app`` cannot observe a host supplied to an external ASGI runner.
# Treat this legacy exported entry point as public and require credentials to
# have been provisioned before the app object is made available. The main.py
# entry point remains suitable for unauthenticated loopback development.
ensure_public_webui_is_provisioned("0.0.0.0")
level_name = (config.log_level or "INFO").upper()
level = getattr(logging, level_name, logging.INFO)

setup_logging(
    log_prefix="api_server",
    console_level=level,
    extra_quiet_loggers=['uvicorn', 'fastapi'],
)

# 从 api.app 导入应用实例
from api.app import app  # noqa: E402

# 导出 app 供 uvicorn 使用
__all__ = ['app']


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host=bind_host,
        port=bind_port,
        reload=True,
    )
