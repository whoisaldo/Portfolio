"""The Megabuilding: David's megabuilding and its street at the canyon's end.

Until this district is built to finished (BIBLE.md, "The Megabuilding"), its
frontages are lined by the shared massing (massing.py). The district's own
work replaces the call below; everything it builds is keyed to the district
name "mega" so it streams in its pack and tiles with it.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw import props as P  # noqa: F401
from ncw.districts import massing

massing.mega()
