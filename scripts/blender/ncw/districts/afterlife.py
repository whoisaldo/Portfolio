"""The Afterlife Block: the garage street's north end round AFTERLIFE, the rooftop and the garage.

Until this district is built to finished (BIBLE.md, "The Afterlife Block"), its
frontages are lined by the shared massing (massing.py). The district's own
work replaces the call below; everything it builds is keyed to the district
name "afterlife" so it streams in its pack and tiles with it.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw import props as P  # noqa: F401
from ncw.districts import massing

massing.afterlife()
