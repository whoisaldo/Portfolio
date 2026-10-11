"""Santo Domingo: the industrial edge along the south street and the garage street's south half.

Until this district is built to finished (BIBLE.md, "Santo Domingo"), its
frontages are lined by the shared massing (massing.py). The district's own
work replaces the call below; everything it builds is keyed to the district
name "santo" so it streams in its pack and tiles with it.
"""
from ncw.kit import *  # noqa: F401,F403
from ncw import buildings as B  # noqa: F401
from ncw import props as P  # noqa: F401
from ncw.districts import massing

massing.santo()
