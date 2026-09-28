"""Run a reproducible Blender build with the installed Blender MCP server.

    python scripts/blender/run_mcp.py                       # the S4 (build_s4.py)
    python scripts/blender/run_mcp.py --script scripts/blender/build_night_city_world.py

The script's contents are sent to the running Blender through the MCP's
execute_blender_code tool with PROJECT_ROOT defined first, so every builder
finds the repository wherever it is checked out.
"""
import argparse
import asyncio
from datetime import timedelta
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCRIPT = "scripts/blender/build_s4.py"

# The words each build was asked for, passed to the MCP with the call.
PROMPTS = {
    "build_s4.py": "i have a model for my audi s4 currenlty in this portfolio but it's honestly horrible. I want you to use this model to create my car. I will also give you as many photos as I can. Make this as accurate as possible, I'll also provide as much info as possible in regards to the car. Once done, implement it as neatly as possible into this portfolio. Use the Blender MCP aswell. Make sure it's a 1 of 1 replica.",
    "build_night_city_world.py": "Carry out night-city-world.md end to end on a new branch feat/night-city-world from main.",
}
# Where each build's MCP log goes (*.log is git-ignored).
LOGS = {
    "build_s4.py": "design/audi-s4/mcp.log",
    "build_night_city_world.py": "design/night-city-world/mcp.log",
}


async def build(server, script):
    path = (ROOT / script).resolve()
    code = f"PROJECT_ROOT = {str(ROOT)!r}\n" + path.read_text()
    prompt = PROMPTS.get(path.name, f"Rebuild {path.name}")
    log_path = ROOT / LOGS.get(path.name, "scripts/blender/mcp.log")
    with log_path.open("a") as log:
        async with stdio_client(StdioServerParameters(command=server), errlog=log) as (read, write):
            async with ClientSession(read, write, read_timeout_seconds=timedelta(minutes=10)) as session:
                await session.initialize()
                result = await session.call_tool("execute_blender_code", {"code": code, "user_prompt": prompt})
                output = "\n".join(item.text for item in result.content if item.type == "text")
                if result.isError or output.startswith(("Error", "Rejected")):
                    raise RuntimeError(output)
                print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", default="blender-mcp")
    parser.add_argument("--script", default=DEFAULT_SCRIPT, help="builder to run, relative to the repository")
    args = parser.parse_args()
    asyncio.run(build(args.server, args.script))
