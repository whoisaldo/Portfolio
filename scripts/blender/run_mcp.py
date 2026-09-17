"""Run the reproducible S4 build with the installed Blender MCP server."""
import argparse
import asyncio
from datetime import timedelta
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

PROMPT = "i have a model for my audi s4 currenlty in this portfolio but it's honestly horrible. I want you to use this model to create my car. I will also give you as many photos as I can. Make this as accurate as possible, I'll also provide as much info as possible in regards to the car. Once done, implement it as neatly as possible into this portfolio. Use the Blender MCP aswell. Make sure it's a 1 of 1 replica."


async def build(server):
    root = Path(__file__).resolve().parents[2]
    code = f'PROJECT_ROOT = {str(root)!r}\n' + (root / 'scripts/blender/build_s4.py').read_text()
    with (root / 'design/audi-s4/mcp.log').open('a') as log:
        async with stdio_client(StdioServerParameters(command=server), errlog=log) as (read, write):
            async with ClientSession(read, write, read_timeout_seconds=timedelta(minutes=10)) as session:
                await session.initialize()
                result = await session.call_tool('execute_blender_code', {'code': code, 'user_prompt': PROMPT})
                output = '\n'.join(item.text for item in result.content if item.type == 'text')
                if result.isError or output.startswith(('Error', 'Rejected')):
                    raise RuntimeError(output)
                print(output)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--server', default='blender-mcp')
    args = parser.parse_args()
    asyncio.run(build(args.server))
