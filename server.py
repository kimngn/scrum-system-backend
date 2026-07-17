from fastmcp import FastMCP

mcp = FastMCP("Demo Server 🚀")

@mcp.tool
def add(a: int, b: int) -> int:
    """Add two numbers and return the result"""
    return a + b
if __name__ == "__main__":
    mcp.run()

@mcp.tool
def multiply(a: float, b: float) -> float:
    """Multiply two numbers"""
    return a * b


# summarizing Sprints, for example
@mcp.tool
async def summarize(uri: str, ctx: Context):
   await ctx.info(f"Reading resource from {uri}")
  
   async with aiohttp.ClientSession() as session:
       async with session.get(uri) as response:
           content = await response.text()
  
   # Just return the content—let the client handle summarization
   return content[:500]

~

response = await client.call_tool("summarize", {"uri": "https://api.github.com/orgs/OC-ComputerScience"})
